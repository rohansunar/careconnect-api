## Database Deployment
1. Create customer and vendor address and location schema without "geoPost" field 
2. Initial Database
3. Create and initial PostGIS Extension, Add "geoPost" Fields and then index fields.

4. Ensure file exists payment-mode.config.json inside src/subscription/config with following data:
    { "payment_mode": "UPFRONT" }
5. Install Redis on the Server
    - sudo apt update
    - sudo apt install redis-server -y
    - sudo systemctl start redis
    - sudo systemctl enable redis // Enable auto-start on reboot:
    - sudo systemctl status redis
    -🧪 Test Redis - redis-cli ping

6. Secure Basic Redis Config (Important for Production)
    - sudo nano /etc/redis/redis.conf
    - Ensure these settings:
        - supervised systemd
        - bind 127.0.0.1 ::1
        - protected-mode yes
    - sudo systemctl restart redis
7. ✅ Your NestJS App Config
    - REDIS_HOST=127.0.0.1
    - REDIS_PORT=6379
8. Example NestJS config (ioredis):
    ```
    RedisModule.forRoot({
     type: 'single',
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    })
    ```
9. Check Where Redis is Configure inside this Project. (Important)


