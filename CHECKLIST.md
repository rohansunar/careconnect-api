## Database Deployment
1. Create customer and vendor address and location schema without "geoPost" field 
2. Initial Database
3. Create and initial PostGIS Extension, Add "geoPost" Fields and then index fields.

4. Ensure file exists payment-mode.config.json inside src/subscription/config with following data:
    { "payment_mode": "UPFRONT" }