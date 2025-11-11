#!/bin/bash

echo ""
echo "🚀 ========================================"
echo "🎬 Bot Telegram Upload Video ke Facebook"
echo "🚀 ========================================"
echo ""

# Get public URL
if [ ! -z "$REPLIT_DEV_DOMAIN" ]; then
  PUBLIC_URL="https://$REPLIT_DEV_DOMAIN"
else
  PUBLIC_URL="https://${REPL_SLUG}.${REPL_OWNER}.replit.dev"
fi

echo "🌍 URL Publik AKTIF:"
echo "   $PUBLIC_URL"
echo ""
echo "📡 Webhook Telegram:"
echo "   $PUBLIC_URL/webhooks/telegram/action"
echo ""
echo "📊 Status Endpoint:"
echo "   $PUBLIC_URL/status"
echo ""
echo "❤️  Keep-Alive Endpoint:"
echo "   $PUBLIC_URL/ping"
echo ""
echo "🚀 ========================================"
echo "✅ Server Status: ONLINE"
echo "✅ Webhook: TERSET OTOMATIS"
echo "🚀 ========================================"
echo ""
echo "📝 Test endpoint di browser:"
echo "   $PUBLIC_URL/status"
echo ""

