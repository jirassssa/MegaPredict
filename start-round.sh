#!/bin/bash
source .env

PRICE=$(curl -s 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT' | jq -r '.price')
PRICE_INT=$(python3 -c "import sys; print(int(float('${PRICE}') * 100000000))")

echo "💰 ETH Price: \$${PRICE}"
echo "📊 Price (int256): ${PRICE_INT}"
echo "🤖 Starting Round 1: UP (65%)"
echo ""

cast send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 500000 "$CONTRACT_ADDRESS" "startRound(int256,uint8,uint256)" "$PRICE_INT" 1 65
