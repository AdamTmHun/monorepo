# What does this rule do?

Checks for messages to have a snake case message id.

Having the message id's in snake case format is beneficial because it allows for easier integration with other tools and libraries, like `@inlang/paraglide-js`.

# How to use

Add the lint rule to your modules array in your `project.inlang.json` file:

```json
{
  "$schema": "https://inlang.com/schema/project-settings",
  "sourceLanguageTag": "en",
  "languageTags": [
    "en",
    "de"
  ],
  "modules": [
    "https://cdn.jsdelivr.net/npm/@inlang/message-lint-rule-snake-case-id@latest/dist/index.js"
  ],
}
```
