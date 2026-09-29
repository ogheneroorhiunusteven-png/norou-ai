# Norou AI Action System

Norou now has an allow-listed action layer. The Command Centre can translate natural-language requests into real app mutations.

Examples:
- “Add a task to finish my IT coursework.”
- “Complete my gym task.”
- “Add a routine called Gym at 4pm on Monday, Wednesday and Friday.”
- “Create a goal called Become a cloud engineer.”
- “Make my coursework goal 60% complete.”
- “Create a note called AWS ideas.”
- “Add an event called College at 09:00 tomorrow.”
- “Remember that I prefer morning study sessions.”
- “Start a 20 minute focus session.”

## AI backend actions

Gemini can emit `[ACTION:{...}]` markers using the documented allow-list. The app strips these markers from the visible reply, executes only recognized action types, and reports that local data changed.

Destructive operations only match existing local records by title/name. External actions are not silently executed by this layer.
