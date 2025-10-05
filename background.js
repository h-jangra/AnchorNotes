// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addNumberLabel",
    title: "Add Number Label",
    contexts: ["all"]
  });
  console.log('Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info);

  if (info.menuItemId === "addNumberLabel") {
    try {
      // Try to send message first
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "addNumberLabel",
        x: info.pageX,
        y: info.pageY
      });
      console.log('Message sent successfully:', response);
    } catch (error) {
      console.log('Content script not ready, injecting...');
      // If content script not loaded, inject it first
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });

        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['styles.css']
        });

        console.log('Scripts injected');

        // Wait a bit for script to initialize
        await new Promise(resolve => setTimeout(resolve, 200));

        // Try sending message again
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "addNumberLabel",
          x: info.pageX,
          y: info.pageY
        });
        console.log('Message sent after injection:', response);
      } catch (injectError) {
        console.error('Failed to inject content script:', injectError);
      }
    }
  }
});
