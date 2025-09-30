document.addEventListener("DOMContentLoaded", () => {
    const emojiInput = document.getElementById("emojiInput");
    const saveButton = document.getElementById("saveEmoji");
    const sizeSlider = document.getElementById("sizeSlider");
    const sizeValue = document.getElementById("sizeValue");
    const popover = document.getElementById("emojiPopover");

    const emojiString =
        "✏️⭐️⚽️🚗🚀🌟🔥💧🎯🔑⚖️⌚️🔋🔒🔓🖊️🖋️✒️📝📝✂️🗜️🧲🧲️🧼🛁🚿🪟🔧🔩🛠️⚙️🧰🧱🔩🧪🧫🧬";

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

    chrome.storage.sync.get(["selectedEmoji"], (result) => {
        if (result.selectedEmoji) {
            emojiInput.value = result.selectedEmoji;
        }
    });

    saveButton.addEventListener("click", () => {
        const emoji = emojiInput.value || emojiInput.placeholder;
        chrome.storage.sync.set({ selectedEmoji: emoji }, () => {
            const originalText = saveButton.textContent;
            saveButton.textContent = "Saved!";
            setTimeout(() => {
                saveButton.textContent = originalText;
            }, 1000);
        });
    });

    sizeSlider.addEventListener("input", (event) => {
        const newSize = event.target.value;
        sizeValue.textContent = `${newSize}px`;

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
