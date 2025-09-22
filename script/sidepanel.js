document.addEventListener("DOMContentLoaded", () => {
    // --- Element References ---
    const emojiInput = document.getElementById("emojiInput");
    const saveButton = document.getElementById("saveEmoji");
    const sizeSlider = document.getElementById("sizeSlider");
    const sizeValue = document.getElementById("sizeValue");
    const popover = document.getElementById("emojiPopover");

    const emojiString =
        "✏️⭐️⚽️🚗🚀🌟🔥💧🎯🔑⚖️⌚️🔋🔒🔓🖊️🖋️✒️📝📝✂️🗜️🧲🧲️🧼🛁🚿🪟🔧🔩🛠️⚙️🧰🧱🔩🧪🧫🧬";

    // --- Emoji Picker Logic ---
    for (const char of emojiString) {
        const btn = document.createElement("button");
        btn.className = "emoji-btn";
        btn.textContent = char;
        btn.addEventListener("click", () => {
            emojiInput.value = char;
            popover.style.display = "none";
        });
        popover.appendChild(btn);
    }

    emojiInput.addEventListener("click", (e) => {
        const rect = emojiInput.getBoundingClientRect();
        popover.style.top = rect.bottom + window.scrollY + "px";
        popover.style.left = rect.left + window.scrollX + "px";
        popover.style.display = "flex";
    });

    document.addEventListener("click", (e) => {
        if (!popover.contains(e.target) && e.target !== emojiInput) {
            popover.style.display = "none";
        }
    });

    // --- Emoji Save Logic ---
    // Use chrome.storage.sync as it's accessible by the background script.
    // localStorage is not shared between the side panel and background script.

    // Load saved emoji on startup
    chrome.storage.sync.get(["selectedEmoji"], (result) => {
        if (result.selectedEmoji) {
            emojiInput.value = result.selectedEmoji;
        }
    });

    // Save emoji on button click
    saveButton.addEventListener("click", () => {
        const emoji = emojiInput.value || emojiInput.placeholder;
        chrome.storage.sync.set({ selectedEmoji: emoji }, () => {
            // Optional: Show a confirmation to the user
            const originalText = saveButton.textContent;
            saveButton.textContent = "Saved!";
            setTimeout(() => {
                saveButton.textContent = originalText;
            }, 1000);
        });
    });

    // --- Size Slider Logic ---
    sizeSlider.addEventListener("input", (event) => {
        const newSize = event.target.value;
        sizeValue.textContent = `${newSize}px`;

        // Find the active tab and send a message to its content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateEmojiSize",
                    size: newSize,
                });
            }
        });
    });
});
