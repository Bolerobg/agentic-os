---
name: nano-banana-prompts
description: REQUIRED for any image generation — uses the 14,000+ curated prompt library from awesome-nano-banana-pro-prompts. Covers every style (photography, anime, 3D, illustration, pixel art, cyberpunk...), subject (portrait, product, food, architecture...), and use case (YouTube thumbnails, e-commerce, comics, posters, icons, social media...). Always use this skill before generating images so the best prompt is found first.
allowed-tools: Bash(gemini:*, ls, grep, cat), Read, Write
---

# Nano Banana Pro Prompts

This skill taps the `awesome-nano-banana-pro-prompts` library — 14,000+ curated prompts with preview images, covering every style, subject, and use case.

## Library Location

```
/Users/bolero/Documents/4/awesome-nano-banana-pro-prompts/README.md
```

Web gallery (with images): https://youmind.com/en-US/nano-banana-pro-prompts

## Workflow

**ALWAYS follow this order:**

1. **Understand the request** — what does the user want? Figure out the category, style, and subject.
2. **Search the library** — use `grep` to find relevant prompts. The README is structured as:
   ```
   ### No. X: Title
   #### 📝 Prompt
   (actual prompt text — copy this exactly)
   ```
3. **Present the best match** — show the user the prompt you found.
4. **Generate** — use `gemini --yolo "/generate '<prompt>'" --preview`

## Categories Reference

| What user wants | Search in prompts for |
|---|---|
| YouTube thumbnail | `youtube.*thumbnail\|thumbnail.*yt` |
| Profile pic / avatar | `profile.*avatar\|avatar.*pfp` |
| Comic / storyboard | `comic\|storyboard\|manga` |
| Product photo / e-commerce | `product.*marketing\|ecommerce\|product.*photo` |
| Poster / flyer | `poster\|flyer\|banner` |
| Icon / app design | `icon\|app.*design\|favicon` |
| Infographic / diagram | `infographic\|diagram\|chart` |
| Game asset | `game.*asset\|sprite\|pixel.*art` |
| Social media post | `social.*media\|instagram\|tweet` |

| What style | Search for |
|---|---|
| Photography | `photography\|photo.*realistic` |
| Anime / manga | `anime\|manga` |
| 3D render | `3d.*render\|three.*dimensional` |
| Illustration | `illustration\|illustrated` |
| Pixel art | `pixel.*art` |
| Cyberpunk / sci-fi | `cyberpunk\|sci-fi\|futuristic` |
| Watercolor | `watercolor` |
| Oil painting | `oil.*painting` |
| Minimalism | `minimalism\|minimalist` |
| Cinematic | `cinematic\|film.*still` |

| What subject | Search for |
|---|---|
| Portrait / person | `portrait\|selfie` |
| Animal / creature | `animal\|creature` |
| Food / drink | `food\|drink` |
| Fashion | `fashion\|clothing` |
| Car / vehicle | `vehicle\|car` |
| Architecture | `architecture\|interior` |
| Landscape / nature | `landscape\|nature` |
| Abstract / background | `abstract\|background` |

## Prompt Search Commands

To find matching prompts, grep the README:

```bash
# Example: find comic-style prompts
grep -B5 -A10 "#\+ 📝 Prompt" /Users/bolero/Documents/4/awesome-nano-banana-pro-prompts/README.md | grep -i "comic" -A15

# Example: find prompts about a specific topic
grep -i "youtube thumbnail" -B10 -A20 /Users/bolero/Documents/4/awesome-nano-banana-pro-prompts/README.md
```

## Generation Command

Once you have the prompt, generate:

```bash
gemini --yolo "/generate '<copy the exact prompt from the library>'" --preview
```

**Important:** Copy the prompt text EXACTLY from the library — these are tested and proven.

## Presenting Results

After generation:
1. Tell the user which prompt you used (No. X: Title)
2. Show where the image was saved (`./nanobanana-output/`)
3. Offer to try variations or another prompt from the library

## Raycast Dynamic Prompts

Some prompts use `{argument name="..."}` syntax. Replace with actual values:

```
A quote card with "{argument name="quote" default="Stay hungry"}" by {argument name="author" default="Jobs"}
→ A quote card with "Stay hungry" by Jobs
```
