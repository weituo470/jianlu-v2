# Project Structure

## Directory Organization

```
.
├── .kiro/                 # Kiro configuration and steering rules
│   └── steering/          # AI assistant guidance documents
├── src/                   # Source code (TBD - adjust based on language)
├── tests/                 # Test files
├── docs/                  # Documentation
├── config/                # Configuration files
└── scripts/               # Build and utility scripts
```

## File Naming Conventions
- Use lowercase with hyphens for directories: `my-component/`
- Follow language-specific conventions for source files
- Use descriptive names that indicate purpose
- Group related files in appropriate directories

## Code Organization Principles
- Separate concerns into distinct modules/files
- Keep related functionality together
- Use clear hierarchical structure
- Maintain consistent patterns across the project

## Configuration Files
- Keep environment-specific configs separate
- Use version control for shared configurations
- Document any required environment variables
- Store sensitive data in environment files (not in repo)

## Documentation Structure
- README.md in root for project overview
- API documentation in docs/
- Inline code comments for complex logic
- Architecture decisions in docs/architecture/