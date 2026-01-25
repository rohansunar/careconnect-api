```
npm test -- src/subscription/tests
npx jest test/subscription/services/customer-subscription.service.spec.ts --verbose

```

List all files in src/subscription directory recursively
Identify controller files containing create subscription, get subscription, and toggle subscription endpoints
Read the relevant controller methods for the specified endpoints
Trace code flow through services, repositories, and other dependencies
Identify unused functions (declared but not invoked)
Identify functions imported in primary service files but not utilized
Identify instances of duplicate logic across the module
Provide detailed report on findings and potential impacts

Review the @/src/search module, focusing on the following search-related endpoints. Analyze the code flow for these endpoints, identifying any unused functions (declared but not invoked), functions imported in the primary service or other service file but not utilized, and instances of duplicate logic and similar type function name but not is use. Report the specific files involved, and evaluate the potential impacts (e.g., on functionality, dependencies, or system stability) if these unused elements or duplicates are removed or modified. Do not make any edits or updates to the code.