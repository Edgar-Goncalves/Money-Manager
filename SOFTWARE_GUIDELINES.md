# Software Guidelines

This document outlines the coding standards and architectural principles for the Money Manager project.

## Core Philosophy: SOLID Refactor
The codebase is structured using a class-based approach to ensure separation of concerns:
- **ApiService**: Handles all external data fetching.
- **StateManager**: Manages the application state and notifies subscribers.
- **UIRenderer**: Handles DOM updates and UI logic.
- **AppController**: Orchestrates the interaction between services and UI.

## Guidelines for Future Development

### 1. Maintain Separation of Concerns
- Do not mix API calls inside UI components.
- State changes should always flow through the `StateManager`.

### 2. Styling
- Use CSS Variables for the color palette.
- Keep the design "Premium" - glassmorphism, smooth transitions, and responsive grids.
- Mobile layout should be compact and not intrude on content visibility.

### 3. Verification
- Always verify UI changes across mobile and desktop viewports.
- Run a "Hard Refresh" to clear cache after CSS updates.

### 4. Git Workflow
- Use semantic commit messages.
- Commit changes incrementally.

---
*Adhering to these guidelines ensures that Money Manager remains a high-quality, professional tool.*
