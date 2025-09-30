console.log(
    "%c Anchor notes loaded",
    "color: hsl(170 60% 60%); font-size: 20px;"
);
const style = document.createElement("style");
style.textContent = `
    .button_emoji {
        font-size: 1.5em;
        background: none;
        color: #fefefe;
        background: rgba(255, 255, 255, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 0.5em;
        padding: 0;
        box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.2);
        transition: all 0.3s;
        anchor-name: --note-anchor;
    }

    .selected-emoji {
        outline: 2px solid hsl(180 100% 40%);
        box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.3), 0 0 0 4px hsla(185, 100%, 40%, 0.5);
    }

    .button_emoji:hover {
        box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.3);
    }

    .button_emoji:active {
        transform: scale(0.95);
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
    }

    .button_emoji span {
        transition: all 0.3s;
    }

    .emoji-note-popover {
        position: absolute;
        position-anchor: --note-anchor;
        top: anchor(bottom);
        left: anchor(left);
        margin: 0;
        margin-block-start: 5px;
        width: 200px;
        height: 100px;
        resize: both;
        opacity: 0;
        transition: display 0.5s, opacity 0.5s;
        transition-behavior: allow-discrete;
        outline: 0;
        padding: 8px;
        border-radius: 10px;
        backdrop-filter: blur(10px);
        background-color: rgba(255, 255, 255, 0.46);
        border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .emoji-note-popover:popover-open {
        opacity: 1;

        @starting-style {
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

const debouncedSaveAllData = debounce(() => saveAllData(), 500);

const noteResizeObserver = new ResizeObserver(() => {
    debouncedSaveAllData();
});

const port = chrome.runtime.connect({ name: "contentScript" });

let lastRightClickedElement = null;
let noteCounter = 0;

document.addEventListener("contextmenu", (event) => {
    lastRightClickedElement = event.target;
});

port.onMessage.addListener((message) => {
    if (message.action === "attachEmoji") {
        if (lastRightClickedElement) {
            attachEmojiToElement(message.emoji, lastRightClickedElement);
            lastRightClickedElement = null;
        } else {
            console.warn(
                "Anchor Notes: No element was targeted for emoji attachment."
            );
        }
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateEmojiSize") {
        const selectedEmoji = document.querySelector(".selected-emoji");
        if (selectedEmoji) {
            selectedEmoji.style.fontSize = `${message.size}px`;
            sendResponse({ status: "size updated" });
        } else {
            sendResponse({ status: "no emoji selected" });
        }
    }
    return true;
});

function deselectAllEmojis() {
    const currentlySelected = document.querySelectorAll(".selected-emoji");
    currentlySelected.forEach((el) => {
        el.classList.remove("selected-emoji");
    });
}

document.addEventListener("click", (event) => {
    const removeButton = document.querySelector(".emoji-remove-btn");
    if (removeButton && event.target !== removeButton) {
        removeButton.remove();
    }

    if (!event.target.closest(".button_emoji")) {
        deselectAllEmojis();
    }
});

function allowDrag(event) {
    event.dataTransfer.setData("text/plain", event.target.id);
}

function handleDrop(event) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    const draggedElement = document.getElementById(id);
    if (draggedElement) {
        draggedElement.style.left = `${event.clientX}px`;
        draggedElement.style.top = `${event.clientY}px`;
        saveAllData();
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
}

function attachEmojiToElement(emoji, targetElement) {
    noteCounter++;
    const noteId = `emojiNote-${noteCounter}`;
    const buttonId = `emojiButton-${noteCounter}`;
    const button = document.createElement("button");
    button.className = "button_emoji";
    button.id = buttonId;
    button.setAttribute("popovertarget", noteId);
    button.innerHTML = `<span>${emoji}</span>`;
    button.draggable = true;

    button.addEventListener("dragstart", allowDrag);

    const removeButton = document.createElement("button");
    removeButton.className = "emoji-remove-btn";
    removeButton.textContent = "x";
    removeButton.style.position = "absolute";
    removeButton.style.top = "-8px";
    removeButton.style.right = "-8px";
    removeButton.style.fontSize = "0.8em";
    removeButton.style.padding = "2px 5px";
    removeButton.style.borderRadius = "50%";
    removeButton.style.border = "none";
    removeButton.style.backgroundColor = "rgba(255, 0, 0, 0.7)";
    removeButton.style.color = "white";
    removeButton.style.cursor = "pointer";
    removeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        button.remove();
        emojiNoteDiv.remove();
        saveAllData();
    });

    button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const existingRemoveBtn = document.querySelector(".emoji-remove-btn");
        if (existingRemoveBtn) {
            existingRemoveBtn.remove();
        }
        button.appendChild(removeButton);
    });

    button.addEventListener("click", (event) => {
        event.stopPropagation();

        const isAlreadySelected = button.classList.contains("selected-emoji");

        deselectAllEmojis();

        if (!isAlreadySelected) button.classList.add("selected-emoji");
    });

    const emojiNoteDiv = document.createElement("div");
    emojiNoteDiv.id = noteId;
    emojiNoteDiv.className = "emoji-note-popover";
    emojiNoteDiv.setAttribute("contenteditable", true);
    emojiNoteDiv.setAttribute("popover", "");

    emojiNoteDiv.addEventListener("input", saveAllData);
    noteResizeObserver.observe(emojiNoteDiv);

    const rect = targetElement.getBoundingClientRect();
    button.style.position = "absolute";
    button.style.left = `${rect.left + window.scrollX}px`;
    button.style.top = `${rect.top + window.scrollY}px`;
    button.style.zIndex = "10000";

    document.body.appendChild(button);
    document.body.appendChild(emojiNoteDiv);
    saveAllData();
}

function saveAllData() {
    const emojiData = [];
    document.querySelectorAll(".button_emoji").forEach((button) => {
        const emoji = button.querySelector("span").textContent;
        const noteId = button.getAttribute("popovertarget");
        const noteElement = document.getElementById(noteId);
        const noteContent = noteElement ? noteElement.innerHTML : "";
        const noteWidth = noteElement ? noteElement.style.width : "";
        const noteHeight = noteElement ? noteElement.style.height : "";
        emojiData.push({
            id: button.id,
            emoji: emoji,
            left: button.style.left,
            top: button.style.top,
            note: noteContent,
            width: noteWidth,
            height: noteHeight,
        });
    });
    localStorage.setItem("anchorNotesData", JSON.stringify(emojiData));
}

function loadAllData() {
    const savedData = localStorage.getItem("anchorNotesData");
    if (savedData) {
        const emojiData = JSON.parse(savedData);

        let maxId = 0;
        emojiData.forEach((data) => {
            const idNum = parseInt(data.id.split("-")[1], 10);
            if (idNum > maxId) {
                maxId = idNum;
            }

            const {
                id: buttonId,
                emoji,
                left,
                top,
                note: noteContent,
                width,
                height,
            } = data;
            const noteId = `emojiNote-${idNum}`;

            const button = document.createElement("button");
            button.className = "button_emoji";
            button.id = buttonId;
            button.setAttribute("popovertarget", noteId);
            button.innerHTML = `<span>${emoji}</span>`;
            button.draggable = true;
            button.addEventListener("dragstart", allowDrag);

            const emojiNoteDiv = document.createElement("div");
            emojiNoteDiv.id = noteId;
            emojiNoteDiv.className = "emoji-note-popover";
            emojiNoteDiv.setAttribute("contenteditable", true);
            emojiNoteDiv.setAttribute("popover", "");
            emojiNoteDiv.innerHTML = noteContent;
            if (width) emojiNoteDiv.style.width = width;
            if (height) emojiNoteDiv.style.height = height;
            emojiNoteDiv.addEventListener("input", saveAllData);
            noteResizeObserver.observe(emojiNoteDiv);

            const removeButton = document.createElement("button");
            removeButton.className = "emoji-remove-btn";
            removeButton.textContent = "x";
            removeButton.style.cssText = `position: absolute; top: -8px; right: -8px; font-size: 0.8em; padding: 2px 5px; border-radius: 50%; border: none; background-color: rgba(255, 0, 0, 0.7); color: white; cursor: pointer;`;
            removeButton.addEventListener("click", (event) => {
                event.stopPropagation();
                button.remove();
                emojiNoteDiv.remove();
                saveAllData();
            });

            button.addEventListener("contextmenu", (event) => {
                event.preventDefault();
                event.stopPropagation();
                const existingRemoveBtn =
                    document.querySelector(".emoji-remove-btn");
                if (existingRemoveBtn) {
                    existingRemoveBtn.remove();
                }
                button.appendChild(removeButton);
            });
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                const isAlreadySelected =
                    button.classList.contains("selected-emoji");
                deselectAllEmojis();
                if (!isAlreadySelected) button.classList.add("selected-emoji");
            });

            button.style.position = "absolute";
            button.style.left = left;
            button.style.top = top;
            button.style.zIndex = "10000";

            document.body.appendChild(button);
            document.body.appendChild(emojiNoteDiv);
        });

        noteCounter = maxId;
    }
}

document.body.addEventListener("drop", handleDrop);
document.body.addEventListener("dragover", handleDragOver);

loadAllData();
