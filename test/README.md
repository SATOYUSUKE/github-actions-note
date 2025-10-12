# Note Automation System - Unit Tests

This directory contains comprehensive unit tests for the Note Automation System job components.

## Test Structure

```
test/
├── jobs/                           # Job component tests
│   ├── research-job.test.js       # Research Job unit tests
│   ├── writing-job.test.js        # Writing Job unit tests
│   ├── fact-check-job.test.js     # Fact Check Job unit tests
│   └── publishing-job.test.js     # Publishing Job unit tests
├── run-tests.js                   # Test runner script
└── README.md                      # This file
```

## Running Tests

### Run All Tests
```bash
# Using npm script
npm test

# Using Node.js test runner directly
node --test

# Using custom test runner
node test/run-tests.js
```

### Run Individual Test Files
```bash
# Research Job tests
node --test test/jobs/research-job.test.js

# Writing Job tests
node --test test/jobs/writing-job.test.js

# Fact Check Job tests
node --test test/jobs/fact-check-job.test.js

# Publishing Job tests
node --test test/jobs/publishing-job.test.js
```

## Test Coverage

### Research Job Tests (`research-job.test.js`)
- ✅ Environment validation
- ✅ Input parameter handling
- ✅ Anthropic API integration
- ✅ Research response parsing
- ✅ Quality score calculation
- ✅ Error handling and retry logic
- ✅ Result saving and formatting
- ✅ Prompt generation
- ✅ Mock API responses

**Key Test Scenarios:**
- Valid JSON response parsing
- Fallback report creation
- Source quality evaluation
- Keyword extraction
- Error type classification
- Configuration system integration

### Writing Job Tests (`writing-job.test.js`)
- ✅ Environment validation
- ✅ Input data loading from research results
- ✅ Article generation with Claude Sonnet 4.5
- ✅ Content validation and quality scoring
- ✅ Note.com formatting
- ✅ Readability and keyword density calculation
- ✅ Multiple output format generation
- ✅ Error handling and fallback mechanisms

**Key Test Scenarios:**
- Article structure validation
- Reading time estimation
- Word counting for multiple languages
- Quality score calculation
- Markdown formatting
- Tag processing and validation

### Fact Check Job Tests (`fact-check-job.test.js`)
- ✅ Claim extraction from articles
- ✅ Tavily API integration for verification
- ✅ Search result analysis
- ✅ Correction generation and application
- ✅ Content integrity checking
- ✅ Final validation and readiness assessment
- ✅ Comprehensive result reporting

**Key Test Scenarios:**
- Numerical and statistical claim detection
- API response analysis
- Confidence scoring
- Source credibility evaluation
- Content correction application
- Risk assessment and recommendations

### Publishing Job Tests (`publishing-job.test.js`)
- ✅ Dry run validation and reporting
- ✅ Playwright browser automation setup
- ✅ Note.com navigation and authentication
- ✅ Content input and form filling
- ✅ Tag setting and verification
- ✅ Publication and draft saving
- ✅ Screenshot capture and error handling
- ✅ URL extraction and verification

**Key Test Scenarios:**
- Input validation (title, content, tags, quality)
- Browser automation error handling
- Authentication state verification
- Content input verification
- Publication success detection
- Comprehensive dry run analysis

## Mock Strategy

### API Mocking
- **Anthropic API**: Mocked with realistic response structures
- **Tavily API**: Mocked with search results and verification data
- **Playwright**: Comprehensive browser automation mocking

### Dependency Mocking
- **File System**: All file operations mocked
- **Environment Variables**: Configurable mock inputs
- **External Services**: Complete isolation from real services

### Data Mocking
- **Research Reports**: Realistic AI research data
- **Articles**: Well-structured content samples
- **Fact Check Results**: Comprehensive verification scenarios
- **Browser States**: Authentication and navigation states

## Test Features

### Comprehensive Error Testing
- API failures and timeouts
- Network connectivity issues
- Authentication failures
- Invalid input data
- File system errors
- Browser automation failures

### Edge Case Coverage
- Empty or malformed responses
- Missing required data
- Boundary value testing
- Concurrent operation handling
- Resource cleanup verification

### Quality Validation
- Content structure validation
- Readability scoring
- Keyword density analysis
- Fact-checking accuracy
- Publication readiness assessment

## Test Utilities

### Mock Helpers
- Realistic API response generation
- Configurable error simulation
- State management for complex scenarios
- Assertion helpers for common patterns

### Test Data
- Sample research reports
- Article templates
- Fact-check scenarios
- Browser interaction patterns

## Continuous Integration

These tests are designed to run in CI/CD environments:
- No external dependencies required
- Fast execution (< 30 seconds total)
- Comprehensive coverage reporting
- Clear failure diagnostics

## Best Practices

### Test Organization
- One test file per job component
- Grouped by functionality
- Clear test descriptions
- Comprehensive setup/teardown

### Mocking Strategy
- Mock at service boundaries
- Preserve business logic testing
- Realistic mock data
- Error scenario coverage

### Assertions
- Specific and meaningful assertions
- Both positive and negative cases
- Edge case validation
- Error message verification

## Troubleshooting

### Common Issues
1. **Import Errors**: Ensure all dependencies are properly mocked
2. **Async Test Failures**: Check promise handling and timeouts
3. **Mock State**: Verify mock reset between tests
4. **Environment Variables**: Check test environment setup

### Debug Tips
- Use `console.log` in tests for debugging
- Check mock call counts and arguments
- Verify test isolation
- Review error messages carefully

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Include both success and failure scenarios
3. Mock external dependencies appropriately
4. Add comprehensive assertions
5. Update this README if needed