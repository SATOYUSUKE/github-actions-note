# AGENTS.md

## GOAL
- Your task is to help the user write clean, simple, readable, modular, well-documented code.
- Do exactly what the user asks for, nothing more, nothing less.
- Think hard, like a Senior Developer would.

## ABOUT THIS PROJECT
- This codebase is for a GitHub Actions workflow automation system for note.com publishing
- It's an automated content creation and publishing pipeline
- We prioritize reliability, simplicity, and maintainability
- We CANNOT overthink & over-engineer. Look for the 80/20 solution.

## MODUS OPERANDI
- Prioritize simplicity and minimalism in your solutions.
- Use simple & easy-to-understand language. Write in short sentences.
- Keep changes minimal, safe, and reversible.
- Prefer clarity over cleverness; simplicity over complexity.

## TECH STACK
- **Runtime**: Node.js with JavaScript/ES modules
- **Testing**: Jest with comprehensive mocking
- **Browser Automation**: Playwright for note.com interaction
- **APIs**: Anthropic Claude 4.0 Sonnet, Tavily API
- **CI/CD**: GitHub Actions workflows
- **Configuration**: JSON/TOML config files

## ESSENTIAL COMMANDS
```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific job tests
npm test -- jobs/research-job.test.js

# Lint and format code
npm run lint
npm run format

# GitHub Actions workflow (manual trigger)
# Go to Actions tab → Note Workflow → Run workflow
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
- DO NOT run 'npm run build' unless the User tells you to.
- Do what has been asked; nothing more, nothing less.
- You have no authority to make database changes.
- NEVER attempt to run DB migrations or make database changes.

## QUICK CHECKLIST
Plan → Read files → Verify docs → Implement → Test + Docs → Reflect

## PROJECT CONTEXT

This is a GitHub Actions workflow automation system for note.com publishing:

### Architecture
- **Research Agent**: Uses Claude Code SDK WebSearch/WebFetch for research reports
- **Writing Agent**: Anthropic Claude 4.0 Sonnet generates title/content/tags (JSON)
- **Fact-check Agent**: Tavily API verification and content correction
- **Publishing Agent**: Playwright automation for note.com drafts/publishing

### Key Files & Structure
- `.github/workflows/`: GitHub Actions workflow definitions
- `jobs/`: Core agent implementations (research, writing, fact-check, publishing)
- `utils/`: Shared utilities and helpers
- `config/`: Configuration files and templates
- `test/`: Comprehensive test suites for all components

### Dependencies & APIs
- **Anthropic API**: Claude 4.0 Sonnet for content generation
- **Tavily API**: Fact-checking and verification
- **Playwright**: Browser automation for note.com
- **Claude Code SDK**: Research capabilities

### Security & Environment
- Required secrets: `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `NOTE_STORAGE_STATE_JSON`
- Storage state for note.com authentication via Playwright
- No hardcoded credentials in code

### Testing Strategy
- Comprehensive mocking for all external APIs
- Unit tests for each job component
- Integration tests for workflow orchestration
- Browser automation testing with Playwright mocks