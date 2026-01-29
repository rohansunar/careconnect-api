```
npm test -- src/subscription/tests
npx jest test/subscription/services/customer-subscription.service.spec.ts --verbose

```

Enforce only one primary address per customer
You can’t do partial unique indexes directly in Prisma schema (yet). Prisma’s schema DSL doesn’t support WHERE clauses on indexes.
But you can still manage it cleanly using Prisma Migrate + raw SQL. That’s the production-grade approach teams use.
```
npx prisma migrate dev --name enforce_single_primary_address

-- Enforce only one primary address per customer

CREATE UNIQUE INDEX unique_primary_address_per_customer
ON "CustomerAddress" ("customerId")
WHERE "isPrimary" = true;

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


I have a system where  a customer can subscribe for product delivery on the frequency of daily, alternative day, or custom days. So the product subscription creation endpoint and the features have been developed. And so I need the next step to be built and how, what next is, next step is. And please explain, create a new document and explain me as a six-year-old, step-by-step.
Reference review @/src/subscription @/prisma/models/otp.prisma @/src/subscription 

Okay, I see the document and it looks good. It's more of the happy path for the order creation for the subscription, but let me refine and  update  the document. So I have two modes of payment for subscription. So either customer can pay online upfront for all the deliveries that will happen. The second is post-delivery. So if everything goes fine, all the delivery is done, so the upfront payment gets Adjusted. But  let's discuss the edge cases. If a vendor misses the delivery or the customer is not available for product delivery or rejects it, so I need to adjust that at the end of the month. And if the subscription is canceled, I need to refund the amount or if the subscription is active, I need to adjust that amount on the renew. So the upfront payment will be adjusted, but the post-delivery, we need to collect the amount from the customer. So that is also there and just document it, everything, and give me a step-by-step guide on how to implement that.
Also reference the existing schema @/prisma/models in update needed
@/src/subscription
@plans/subscription


Propose indexes for analytics
Suggest Prisma schema
Or show query patterns for growth metrics
If this query is slow, it's because of:
Missing indexes
Fetching too much relational data
Large OFFSET pagination
No caching
Poor DB connection pooling
We fix those — you get sub-second responses.


await this.prisma.order.findMany({ where: query, skip, take: limit, include: { orderItems: { select: { quantity: true, product: { select: { name: true } }, }, }, address: { select: { address: true, pincode: true, location: { select: { name: true, state: true, country: true, }, }, }, }, }, orderBy: { created_at: 'desc' }, }); how to optimize this query to respinse in 1 sec for 1 lahks users