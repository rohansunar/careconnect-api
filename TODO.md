1. Fix Vendor/Admin Image Upload - Done
2. Fix Vendor/Admin Image Delete - Done
4. Fix Vendor/Admin Image Reorder - Done
4.1. Apply OTP Generate Limit.
4.2. Add Vendor Bank Account - Done
4.3. Add Vendor License Details
5. Add endpoint active product (Undone Delete Product)

Common
1. Build Loose Coupled Structure
    Lets say we have Restrautant and Menu
    Add Service that Communicate Restrautant and its Item
    Where User has do first have communicate with Restrautant and its menus
    
Customer
1. CRUD for Customer Address - Done
2. Make One Address Default - Done
3. Cart CRUD - Done
4. Order CRUD - Done
5. Payment - Done
6. Let Say Customer Adding Product to Cart (Add Logic if Customer Adds Product for same vendor is Ok.
    If Product are from Different Vendor when cart already has Product other Vendor show Error or Discard all Products )
7. Make Address Default While Creating if they are no other address in table.
8. When Customer Lands to the Product they must see "Order Now" and "Subscribed" buttons.
9. Assign Order to Rider

Cart 
1. Implement checkout endpoint POST /customers/me/checkout

Admin
1. Approve Vendor or DisApprove 
2. Approve Vendor Products Auto or Manually
3. 

5. Add Logger on controllers and Services what changed who changed and when changed
6. Add Swagger Documentation
7. Add Unit Test
8. Add Integration Test
9. Add Exception Handling
10. Add Validation
11. Add Security
12. Add Caching
13. Add Logging
14. Add Monitoring
15. Add Health Check
16. Add Rate Limiting
17. Add Circuit Breaker
18. Add Retry Policy


Reply IDFC Bank Arbitration Notice

<!-- Handle This -->
Error in verifyOtpAndCreateVendor: UnauthorizedException: Invalid OTP
    at OtpService.verifyOtp (/home/rohan/Desktop/water-v2/api/src/otp/services/otp.service.ts:94:13)
    at async VendorAuthService.verifyOtpAndCreateVendor (/home/rohan/Desktop/water-v2/api/src/auth/services/vendor-auth.service.ts:54:7)
    at async /home/rohan/Desktop/water-v2/api/node_modules/@nestjs/core/router/router-execution-context.js:46:28
    at async Object.<anonymous> (/home/rohan/Desktop/water-v2/api/node_modules/@nestjs/core/router/router-proxy.js:9:17) {
  response: { message: 'Invalid OTP', error: 'Unauthorized', statusCode: 401 },
  status: 401,
  options: {}
}