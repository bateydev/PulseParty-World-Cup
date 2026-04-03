# AWS Sandbox Cost Estimate - PulseParty Deployment

## Budget: $50
## Estimated Monthly Cost: **$2-5** ✅ SAFE
## Estimated Testing/Demo Cost (1-2 days): **< $1** ✅ VERY SAFE

---

## Detailed Cost Breakdown

### 1. DynamoDB Table (On-Demand)
**Configuration:**
- On-demand billing mode
- Single table with GSI
- TTL enabled (free)

**Pricing:**
- Storage: $0.25 per GB-month
- Read requests: $0.25 per million requests
- Write requests: $1.25 per million requests

**Estimated Usage (Testing/Demo):**
- Storage: < 100 MB = **$0.02**
- Reads: ~10,000 requests = **$0.003**
- Writes: ~5,000 requests = **$0.006**

**Subtotal: ~$0.03/day or $0.90/month**

---

### 2. Lambda Functions (6 functions)
**Configuration:**
- 6 Lambda functions (Ingestion, RoomState, MomentEngine, Scoring, Recap, WebSocket)
- 256 MB memory each
- Node.js runtime

**Pricing:**
- First 1M requests/month: FREE
- After: $0.20 per million requests
- Compute: $0.0000166667 per GB-second

**Estimated Usage (Testing/Demo):**
- Invocations: ~5,000 total = **FREE** (within free tier)
- Compute time: ~10,000 GB-seconds = **$0.17**

**Subtotal: ~$0.17/day or $5/month**

---

### 3. API Gateway WebSocket API
**Configuration:**
- WebSocket API with 3 routes
- CloudWatch logging enabled

**Pricing:**
- Connection minutes: $0.25 per million minutes
- Messages: $1.00 per million messages

**Estimated Usage (Testing/Demo):**
- Connections: 10 users × 2 hours = 1,200 minutes = **$0.0003**
- Messages: ~10,000 messages = **$0.01**

**Subtotal: ~$0.01/day or $0.30/month**

---

### 4. EventBridge Event Bus
**Configuration:**
- Custom event bus
- Routing rules by match ID

**Pricing:**
- Custom events: $1.00 per million events
- Rules: Free

**Estimated Usage (Testing/Demo):**
- Events: ~5,000 events = **$0.005**

**Subtotal: ~$0.005/day or $0.15/month**

---

### 5. Cognito User Pool
**Configuration:**
- User pool with identity pool
- Guest user support

**Pricing:**
- First 50,000 MAU (Monthly Active Users): FREE
- After: $0.0055 per MAU

**Estimated Usage (Testing/Demo):**
- Users: < 100 = **FREE** (within free tier)

**Subtotal: $0**

---

### 6. CloudWatch Logs
**Configuration:**
- Lambda function logs
- API Gateway logs

**Pricing:**
- Ingestion: $0.50 per GB
- Storage: $0.03 per GB-month

**Estimated Usage (Testing/Demo):**
- Log data: ~500 MB = **$0.25**
- Storage: ~500 MB = **$0.015**

**Subtotal: ~$0.27/day or $8/month**

---

### 7. IAM Roles & Policies
**Pricing:** FREE

---

## Total Cost Summary

### Testing/Demo (1-2 days):
| Service | Cost |
|---------|------|
| DynamoDB | $0.03 |
| Lambda | $0.17 |
| API Gateway | $0.01 |
| EventBridge | $0.005 |
| Cognito | $0 (free tier) |
| CloudWatch | $0.27 |
| **TOTAL** | **~$0.50/day** |

### Monthly (if left running):
| Service | Cost |
|---------|------|
| DynamoDB | $0.90 |
| Lambda | $5.00 |
| API Gateway | $0.30 |
| EventBridge | $0.15 |
| Cognito | $0 (free tier) |
| CloudWatch | $8.00 |
| **TOTAL** | **~$14.35/month** |

---

## Budget Safety Analysis

### ✅ Your $50 Budget is SAFE

**For Testing/Demo (recommended):**
- 1 day: ~$0.50
- 2 days: ~$1.00
- 1 week: ~$3.50
- **You can safely test for 100 days before hitting $50**

**For Full Month:**
- Estimated: $14.35
- **Well within your $50 budget**
- **You could run this for 3+ months**

---

## Cost Optimization Tips

### 1. Minimize CloudWatch Logs (Biggest Cost)
CloudWatch logs are the largest expense (~$8/month). To reduce:

```typescript
// In Lambda functions, reduce log verbosity
// Only log errors and important events
console.error('Error:', error); // Keep
// console.log('Debug info:', data); // Remove for production
```

**Savings: ~$6/month**

### 2. Delete Stack When Not Testing
When you're done testing for the day:
```bash
cd infrastructure
npm run destroy
```

This removes all resources and stops charges.

**Savings: 100% when not in use**

### 3. Use Simulator Mode
The infrastructure includes a simulator mode that doesn't require external event feeds.

**Savings: No additional data transfer costs**

### 4. Limit Test Duration
For demos/testing:
- Deploy → Test (1-2 hours) → Destroy
- Cost per session: ~$0.02

**Savings: ~$14/month**

---

## Recommended Approach for $50 Budget

### Option A: Deploy & Destroy Daily (BEST)
```bash
# Morning: Deploy
./deploy-sandbox-no-cli.sh

# Test for 2-3 hours
# ...

# Evening: Destroy
cd infrastructure && npm run destroy
```

**Cost: ~$0.10/day = $3/month**
**Budget remaining: $47**

### Option B: Keep Running for Testing
Leave deployed for continuous testing.

**Cost: ~$14/month**
**Budget remaining: $36**

### Option C: Weekend Testing Only
Deploy Friday, destroy Sunday.

**Cost: ~$1.50/weekend = $6/month**
**Budget remaining: $44**

---

## Real-Time Cost Monitoring

### Set Up Budget Alerts (Recommended)

1. Go to AWS Console → Billing → Budgets
2. Create budget: $10 threshold
3. Set alerts at:
   - 50% ($5) - Email warning
   - 80% ($8) - Email alert
   - 100% ($10) - Email critical

### Check Current Costs

```bash
# If AWS CLI is available
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

Or check in AWS Console → Billing Dashboard

---

## Emergency Stop

If costs are approaching your budget:

```bash
# Immediately destroy all resources
cd infrastructure
npm run destroy

# Verify in AWS Console that all resources are deleted
```

---

## Conclusion

### ✅ SAFE TO DEPLOY

With your $50 budget:
- **Testing/Demo (1-2 days): ~$1** - Extremely safe
- **Full month running: ~$14** - Very safe
- **3+ months running: ~$43** - Still within budget

### Recommendation:
1. **Deploy now** - costs are minimal
2. **Test for 1-2 days** - will cost < $1
3. **Destroy when done** - if you want to save budget
4. **Or keep running** - still well within $50 budget

**You have plenty of budget headroom. Go ahead and deploy!** 🚀

---

## Questions?

- **Q: What if I forget to destroy?**
  - A: Even running for a full month is only ~$14, well within budget

- **Q: Can I reduce costs further?**
  - A: Yes, disable CloudWatch detailed logging (saves ~$6/month)

- **Q: What's the absolute maximum cost?**
  - A: With heavy usage: ~$20/month (still safe)

- **Q: How do I know if I'm spending too much?**
  - A: Set up AWS Budget alerts (see above)
