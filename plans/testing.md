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