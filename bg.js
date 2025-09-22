let contentScriptPorts = {};

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "contentScript") {
        const tabId = port.sender.tab.id;
        contentScriptPorts[tabId] = port;

        port.onDisconnect.addListener(() => {
            delete contentScriptPorts[tabId];
        });
    }
});
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "attachEmojiMenu",
        title: "Attach Emoji",
        contexts: ["all"],
    });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "attachEmojiMenu" && contentScriptPorts[tab.id]) {
        chrome.storage.sync.get(["selectedEmoji"], (result) => {
            const emojiToAttach = result.selectedEmoji || "★";
            contentScriptPorts[tab.id].postMessage({
                action: "attachEmoji",
                emoji: emojiToAttach,
            });
        });
    } else {
        console.warn("Content script not ready for tab:", tab.id);
    }
});
