#!/bin/bash

# مضمونة - Complete Auto Deploy Script
echo "🚀 مضمونة - Auto Deploy Starting..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in madmona-app directory"
    echo "Run: cd C:\\madmona-app && auto-deploy-complete.bat"
    exit 1
fi

echo "✅ Project files found!"
echo "📱 Project: Madmona Coworking App"
echo "🌐 Domain: madmonacairo.com" 
echo "🎨 Design: Arabic RTL + Brand Colors"

# Git setup
echo "🔧 Setting up Git..."
git init
git branch -M main
git add .

# Commit with comprehensive message
git commit -m "🚀 PRODUCTION DEPLOY: Madmona Coworking App

✨ Complete Features:
- Arabic RTL responsive web app
- 4 coworking spaces with dynamic pricing
- Indoor: 50ج/hr, 120ج/day, 2000ج/month
- Outdoor: 65ج/day (garden space)
- Private Office: 12000ج/month (up to 8 people)
- Meeting Room: 300-500ج/hour
- WhatsApp integration: 01002229982
- Location: 7 Soliman St, Nasr City, Cairo
- Free trial banner: 'First day free'
- PWA ready for mobile installation

🎨 Design System:
- Brand colors: #1F5F3F green, #B8860B gold, #C2410C orange
- Tailwind CSS with custom Arabic RTL
- Mobile-first responsive design
- Smooth animations and interactions

🔧 Technical Stack:
- Next.js 14 with TypeScript
- Optimized for Vercel deployment
- Environment variables ready
- Security headers configured
- SEO optimized for Egyptian market

🎯 Ready for madmonacairo.com production deployment!
Serving the coworking community in Cairo 🏢"

echo "✅ Git repository ready!"
echo "🌐 Repository will be: github.com/YOUR_USERNAME/madmona-app"
echo ""
echo "🎯 Next steps:"
echo "1. Create GitHub repository: madmona-app"
echo "2. Push code: git remote add origin [URL] && git push"
echo "3. Deploy on Vercel: Import from GitHub"
echo "4. Connect domain: madmonacairo.com"
echo ""
echo "🚀 The website will be live in 15 minutes!"
