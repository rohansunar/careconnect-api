# Diagrams for Subscription System

## Overview
This document contains Mermaid diagrams to visualize the subscription system's architecture, workflows, and database schema.

## System Architecture Diagram

```mermaid
graph TD
    A[User] --> B[Frontend]
    B --> C[Backend API]
    C --> D[Subscription Service]
    C --> E[Delivery Service]
    C --> F[Payment Service]
    C --> G[Adjustment Service]
    D --> H[Database]
    E --> H
    F --> H
    G --> H
    F --> I[Stripe API]
```

## Subscription Creation Workflow

```mermaid
graph TD
    A[User selects product and frequency] --> B[System calculates total quantity and price]
    B --> C[User confirms subscription]
    C --> D[System processes initial payment]
    D --> E[Subscription is activated]
```

## End-of-Month Billing Adjustment Workflow

```mermaid
graph TD
    A[End of month detected] --> B[System calculates expected deliveries]
    B --> C[System compares with actual deliveries]
    C --> D{Discrepancy found?}
    D -->|Yes| E[Calculate adjustment amount]
    D -->|No| F[No adjustment needed]
    E --> G[Process refund or additional charge]
    G --> H[Update subscription for next month]
```

## Database Schema ER Diagram

```mermaid
erDiagram
    Subscription ||--o{ Delivery : "has"
    Subscription ||--o{ Adjustment : "has"
    Subscription }|--|| CustomerAddress : "belongs to"
    Subscription }|--|| Vendor : "belongs to"
    Subscription }|--|| Product : "belongs to"
    Delivery }|--|| Order : "belongs to"
```

## Payment Processing Workflow

```mermaid
graph TD
    A[User initiates payment] --> B[System creates payment intent]
    B --> C[Stripe processes payment]
    C --> D{Payment successful?}
    D -->|Yes| E[Update payment status to PAID]
    D -->|No| F[Update payment status to FAILED]
    E --> G[Notify user of success]
    F --> G[Notify user of failure]
```

## Delivery Tracking Workflow

```mermaid
graph TD
    A[Delivery scheduled] --> B[Delivery attempted]
    B --> C{Delivery successful?}
    C -->|Yes| D[Update delivery status to DELIVERED]
    C -->|No| E[Update delivery status to MISSED]
    D --> F[Notify user of delivery]
    E --> F[Notify user of missed delivery]
```

## Adjustment Processing Workflow

```mermaid
graph TD
    A[End of month detected] --> B[Calculate expected deliveries]
    B --> C[Retrieve actual deliveries]
    C --> D[Compare expected vs. actual]
    D --> E{Discrepancy found?}
    E -->|Yes| F[Calculate adjustment amount]
    E -->|No| G[No adjustment needed]
    F --> H[Process refund or additional charge]
    H --> I[Update subscription for next month]
    I --> J[Notify user of adjustment]
```

## Next Steps
- Use these diagrams to guide the implementation of the subscription system.
- Update the diagrams as the system evolves.
- Ensure all stakeholders understand the system architecture and workflows.