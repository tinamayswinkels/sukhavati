#!/usr/bin/env node

/**
 * To use this script, navigate to the root directory of your website project in the terminal,
 * then execute the script using the following command:
 * 
 * node media-cleanup.js 
 * 
 * then you'll find a new file called media-cleanup-output.json that lists all the images that aren't used anywhere. 
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
    rootDirectory: '.',  
    mediaFolders: ["uploads", "assets"],  
    mediaTypes: ["png", "jpg", "jpeg", "webp", "svg", "mov", "mp4"],  
    scanFileTypes: ["html", "md", "css", "scss"],
    excludedFolders: ["node_modules", "_site", "_media-archive"]
};

// Function to get all files in a directory recursively
async function getFilesInDirectory(directory, extension) {
    let files = [];
    const items = await fs.readdir(directory, { withFileTypes: true });

    for (const item of items) {
        const res = path.resolve(directory, item.name);
        if (item.isDirectory()) {
            if (config.excludedFolders.includes(item.name)) {
                continue;  // Skip excluded folders
            }
            files = files.concat(await getFilesInDirectory(res, extension));
        } else if (item.name.endsWith(extension)) {
            files.push(res);
        }
    }

    return files;
}

// Function to get all media files
async function getMediaFiles() {
    let mediaFiles = [];
    for (const folder of config.mediaFolders) {
        for (const type of config.mediaTypes) {
            const files = await getFilesInDirectory(path.join(config.rootDirectory, folder), `.${type}`);
            mediaFiles = mediaFiles.concat(files);
        }
    }
    return mediaFiles;
}

// Function to get all project files
async function getProjectFiles() {
    let projectFiles = [];
    for (const type of config.scanFileTypes) {
        const files = await getFilesInDirectory(config.rootDirectory, `.${type}`);
        projectFiles = projectFiles.concat(files);
    }
    return projectFiles;
}

// Function to get unused media files and used media files organized by file
async function getMediaFilesUsage() {
    const mediaFiles = await getMediaFiles();
    const projectFiles = await getProjectFiles();

    const unusedMediaFiles = [];
    const usedMediaFilesByFile = {};

    for (const mediaFile of mediaFiles) {
        const mediaFileName = path.basename(mediaFile);
        const regex = new RegExp(mediaFileName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        let isUsed = false;

        for (const projectFile of projectFiles) {
            const content = await fs.readFile(projectFile, 'utf-8');
            if (regex.test(content)) {
                isUsed = true;
                const relativeProjectFile = path.relative(config.rootDirectory, projectFile);
                if (!usedMediaFilesByFile[relativeProjectFile]) {
                    usedMediaFilesByFile[relativeProjectFile] = [];
                }
                usedMediaFilesByFile[relativeProjectFile].push(path.relative(config.rootDirectory, mediaFile));
            }
        }

        if (!isUsed) {
            unusedMediaFiles.push(path.relative(config.rootDirectory, mediaFile));
        }
    }

    return { unusedMediaFiles, usedMediaFilesByFile };
}

// Function to move unused media files to _media-archive folder
async function moveUnusedMediaFiles(unusedMediaFiles) {
    console.log('Unused media files:', unusedMediaFiles);

    const archiveFolder = path.join(config.rootDirectory, '_media-archive');
    console.log('Archive folder:', archiveFolder);

    // Check if the _media-archive folder exists, if not, create it
    try {
        await fs.access(archiveFolder);
    } catch (error) {
        console.log('Archive folder does not exist. Creating it now.');
        await fs.mkdir(archiveFolder);
    }

    for (const file of unusedMediaFiles) {
        const oldPath = path.join(config.rootDirectory, file);
        const newPath = path.join(archiveFolder, path.basename(file));
        try {
            // Add a delay before moving the file
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fs.rename(oldPath, newPath);
            console.log(`Successfully moved file from ${oldPath} to ${newPath}`);
        } catch (error) {
            console.error(`Failed to move file ${oldPath} to ${newPath}:`, error);
        }
    }
}


const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to ask for confirmation
function askForConfirmation(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

// Main function
async function main() {
    const { unusedMediaFiles, usedMediaFilesByFile } = await getMediaFilesUsage();
    const output = {
        "Unused Images": unusedMediaFiles,
        "Used Images Organized by File": usedMediaFilesByFile
    };
    await fs.writeFile('media-cleanup-output.json', JSON.stringify(output, null, 2));

    const totalUsedMediaFiles = Object.values(usedMediaFilesByFile).reduce((sum, files) => sum + files.length, 0);
    const totalMediaFiles = unusedMediaFiles.length + totalUsedMediaFiles;

    console.log(`\nScan complete.\n`);
    console.log(`You have a total of ${totalMediaFiles} images and videos in your media library and only ${totalUsedMediaFiles} are used in this project.`);
    console.log(`There are ${unusedMediaFiles.length} unused media assets.\n`);
    console.log(`Detailed information has been written to media-cleanup-output.json.\n`);

    // Check if "move" was passed as a command line argument
    if (process.argv[2] === 'move') {
        const confirmation = await askForConfirmation(`Are you sure you want to move ${unusedMediaFiles.length} files from the [assets, images] folder to the media-archive folder? (Y/N) `);
        if (confirmation) {
            // Call moveUnusedMediaFiles function
            await moveUnusedMediaFiles(unusedMediaFiles);
        }
    }

    rl.close();
}

// Call the main function
main().catch(console.error);