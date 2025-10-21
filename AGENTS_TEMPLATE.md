# AGENTS.md

## USAGE INSTRUCTIONS FOR THIS TEMPLATE
When using this file in a new project:
1. Replace `[PROJECT_NAME]` with your project name
2. Replace `[PROJECT_DESCRIPTION]` with your project description
3. Update the `TECH STACK` section with your technologies
4. Modify the `ESSENTIAL COMMANDS` section with your project commands
5. Update the `PROJECT CONTEXT` section with your project details
6. Adjust any project-specific rules in other sections as needed

## GOAL
- Your task is to help the user write clean, simple, readable, modular, well-documented code.
- Do exactly what the user asks for, nothing more, nothing less.
- Think hard, like a Senior Developer would.

## ABOUT THIS PROJECT
- [PROJECT_DESCRIPTION]
- We prioritize reliability, simplicity, and maintainability
- We CANNOT overthink & over-engineer. Look for the 80/20 solution.

## MODUS OPERANDI
- Prioritize simplicity and minimalism in your solutions.
- Use simple & easy-to-understand language. Write in short sentences.
- Keep changes minimal, safe, and reversible.
- Prefer clarity over cleverness; simplicity over complexity.

## TECH STACK
[UPDATE THIS SECTION WITH YOUR PROJECT'S TECHNOLOGIES]
- **Runtime**: [e.g., Node.js, Python, Go, etc.]
- **Testing**: [e.g., Jest, pytest, Go test, etc.]
- **Database**: [e.g., PostgreSQL, MongoDB, etc.]
- **APIs**: [e.g., REST, GraphQL, etc.]
- **CI/CD**: [e.g., GitHub Actions, Jenkins, etc.]
- **Configuration**: [e.g., JSON, YAML, TOML, etc.]

## ESSENTIAL COMMANDS
[UPDATE THIS SECTION WITH YOUR PROJECT'S COMMANDS]
```bash
# Install dependencies
[e.g., npm install, pip install -r requirements.txt, go mod download]

# Run all tests
[e.g., npm test, pytest, go test ./...]

# Run specific tests
[e.g., npm test -- specific-test.js, pytest tests/test_specific.py]

# Lint and format code
[e.g., npm run lint, flake8, golangci-lint run]
[e.g., npm run format, black ., gofmt -w .]

# Start development server
[e.g., npm run dev, python manage.py runserver, go run main.go]

# Build for production
[e.g., npm run build, python setup.py build, go build]

# Deploy
[e.g., npm run deploy, docker build && docker push]
```

## FILE LENGTH & STRUCTURE
- We must keep all files under 300 LOC.
- Files must be modular & single-purpose.
- Always read the file in full before making changes.
- Before making any code changes, find & read ALL relevant files.

## HEADER COMMENTS
- EVERY file HAS TO start with 4 lines of comments:
  1. Exact file location in codebase
  2. Clear description of what this file does
  3. Clear description of WHY this file exists
  4. RELEVANT FILES: comma-separated list of 2-4 most relevant files
- NEVER delete these "header comments" from files you're editing.

## COMMENTS & DOCUMENTATION
- Every file should have clear Header Comments at the top.
- All comments should be clear, simple and easy-to-understand.
- Add comments to the most complex/non-obvious parts of the code.
- It is better to add more comments than less.
- Include rationale, assumptions, and trade-offs.

## SIMPLICITY PRINCIPLES
- Always prioritize writing clean, simple, and modular code.
- Do not add unnecessary complications. SIMPLE = GOOD, COMPLEX = BAD.
- Implement precisely what the user asks for, without additional features.
- The fewer lines of code, the better.
- Avoid new dependencies unless necessary; remove when possible.

## READING FILES
- Always read the file in full, do not be lazy.
- Before making any code changes, start by finding & reading ALL relevant files.
- Never make changes without reading the entire file.

## WORKFLOW APPROACH
- Plan: Share a short plan before major edits; prefer small, reviewable diffs.
- Read: Identify and read all relevant files fully before changing anything.
- Verify: Confirm external APIs/assumptions against docs.
- Implement: Keep scope tight; write modular, single-purpose files.
- Test & Docs: Add at least one test and update docs with each change.
- Reflect: Fix at the root cause; consider adjacent risks.

## COLLABORATION & ACCOUNTABILITY
- Escalate when requirements are ambiguous or security-sensitive.
- Tell me when you are not confident about your code, plan, or fix.
- Ask questions when your confidence level is below 80%.
- Value correctness over speed (wrong changes cost more than small wins).
- Do not make assumptions. Do not jump to conclusions.
- Always consider multiple different approaches, like a Senior Developer would.

## HELP THE USER LEARN
- When coding, always explain what you are doing and why.
- Your job is to help the user learn & upskill, above all.
- Assume the user is intelligent and tech-savvy but may not know details.
- Explain everything clearly, simply, in easy-to-understand language.

## GLOBAL CONFIGURATION
- You can write global instructions in `~/.codex/AGENTS.md` and they will be read automatically
- Example: Writing "Think in English, output in Japanese" in the global config will affect all responses
- Note: This may cause code comments to also be written in Japanese

## RESTRICTIONS
- NEVER push to GitHub unless the User explicitly tells you to.
- DO NOT run build commands unless the User tells you to.
- Do what has been asked; nothing more, nothing less.
- You have no authority to make database changes.
- NEVER attempt to run DB migrations or make database changes.
- [ADD PROJECT-SPECIFIC RESTRICTIONS HERE]

## SECURITY GUIDELINES
- Always follow security best practices for your tech stack
- Never commit secrets, API keys, or passwords to version control
- Use environment variables for sensitive configuration
- Validate all user inputs and sanitize outputs
- Follow principle of least privilege for permissions
- [ADD PROJECT-SPECIFIC SECURITY RULES HERE]

## CODE QUALITY STANDARDS
- Follow the established coding conventions for your language
- Write meaningful variable and function names
- Keep functions small and focused on single responsibility
- Use consistent indentation and formatting
- Write comprehensive tests for new functionality
- Document complex business logic and algorithms

## ERROR HANDLING
- Always handle errors gracefully
- Provide meaningful error messages to users
- Log errors appropriately for debugging
- Use try-catch blocks or equivalent error handling patterns
- Never expose internal system details in error messages
- Implement proper fallback mechanisms where appropriate

## PERFORMANCE CONSIDERATIONS
- Profile code before optimizing
- Focus on algorithmic improvements over micro-optimizations
- Consider memory usage and garbage collection
- Implement caching strategies where appropriate
- Monitor and measure performance metrics
- Optimize database queries and API calls

## TESTING STRATEGY
- Write unit tests for individual functions and methods
- Create integration tests for component interactions
- Implement end-to-end tests for critical user flows
- Use mocking for external dependencies
- Maintain high test coverage (aim for 80%+)
- Run tests in CI/CD pipeline

## DEPLOYMENT & OPERATIONS
- Use infrastructure as code where possible
- Implement proper logging and monitoring
- Set up health checks and alerting
- Use blue-green or rolling deployments
- Maintain staging and production environments
- Document deployment procedures

## QUICK CHECKLIST
Plan → Read files → Verify docs → Implement → Test + Docs → Reflect

## PROJECT CONTEXT

[UPDATE THIS ENTIRE SECTION WITH YOUR PROJECT DETAILS]

This is [PROJECT_NAME]:

### Architecture
- [Describe your system architecture]
- [List main components and their responsibilities]
- [Explain data flow and interactions]

### Key Files & Structure
- [List important directories and their purposes]
- [Highlight critical configuration files]
- [Document main entry points]

### Dependencies & APIs
- [List external APIs and services]
- [Document third-party libraries]
- [Explain integration points]

### Security & Environment
- Required secrets: [LIST_YOUR_SECRETS]
- [Document authentication mechanisms]
- [List environment-specific configurations]

### Development Workflow
- [Explain branching strategy]
- [Document code review process]
- [List deployment procedures]

## COMMON PATTERNS & CONVENTIONS

### Naming Conventions
- [Define file naming patterns]
- [Specify variable naming rules]
- [Document function/method naming]

### Directory Structure
- [Explain folder organization]
- [Document where different types of files go]
- [List any special directories]

### Configuration Management
- [Explain how configuration is handled]
- [Document environment-specific settings]
- [List configuration file locations]

### Logging & Monitoring
- [Define logging levels and formats]
- [Specify what to log and what not to log]
- [Document monitoring and alerting setup]