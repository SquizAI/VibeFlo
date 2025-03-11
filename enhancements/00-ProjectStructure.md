# Project Structure and Architecture Standards

## Overview

This document defines the architectural patterns and folder structure for the PRJCT_MGR application. Following these standards will ensure consistency and maintainability as the application grows.

## Folder Structure

```
src/
├── api/                  # API layer - communication with backend
├── components/           # Reusable UI components
│   ├── core/             # Fundamental components (Button, Input, etc.)
│   ├── layout/           # Layout components (Header, Sidebar, etc.)
│   └── features/         # Feature-specific components
├── hooks/                # Custom React hooks
├── pages/                # Top-level page components
├── services/             # Business logic services
├── store/                # State management
├── styles/               # Global styles, themes, and variables
├── types/                # TypeScript type definitions
└── utils/                # Utility functions and helpers
```

## Component Structure

Each component should follow this structure:

- **Index file**: Exports the component
- **Component file**: Contains the main component logic
- **Styles file**: Contains component-specific styles
- **Types file**: Contains component-specific type definitions
- **Tests file**: Contains component tests

## Tasks

- [ ] Reorganize current file structure to match the standard
- [ ] Create documentation template for components
- [ ] Set up linting rules to enforce structure
- [ ] Create component generator script

## Code Style Guidelines

- Use functional components with hooks
- Prefer named exports over default exports
- Explicitly type all props and state
- Apply consistent naming conventions
  - Components: PascalCase
  - Functions: camelCase
  - Constants: UPPER_SNAKE_CASE

## Integration with Cursor

As we're developing with Cursor integration in mind:

- Keep consistent file structure
- Use standard JSDoc comments for better IDE hints
- Implement progressive enhancement for Cursor-specific features
- Maintain API documentation that can be dynamically loaded in Cursor 