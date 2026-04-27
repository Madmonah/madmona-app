#!/bin/bash
# مضمونة - Deployment Script
# نشر المشروع على GitHub + Vercel + Domain

echo "🚀 بداية نشر مضمونة على madmonacairo.com"
echo "========================================="

# Step 1: Git Setup
echo "📂 إعداد Git Repository..."
git init
git add .
git commit -m "Initial commit: Madmona coworking app ready for production"

# يفترض إن اليوزر عمل repository على GitHub باسم madmona-app
echo "📤 رفع الكود لـ GitHub..."
echo "⚠️  تأكد إنك عملت repository على GitHub باسم: madmona-app"
read -p "Press Enter after creating GitHub repo..."

# تغيير YOUR_USERNAME لليوزر الفعلي
read -p "Enter your GitHub username: " USERNAME
git remote add origin https://github.com/$USERNAME/madmona-app.git
git branch -M main
git push -u origin main

echo "✅ الكود اترفع بنجاح لـ GitHub!"

# Step 2: Vercel Instructions  
echo ""
echo "🌐 النشر على Vercel:"
echo "1. روح على https://vercel.com"
echo "2. سجل دخول بـ GitHub account"
echo "3. اضغط 'New Project'"
echo "4. اختار madmona-app repository"
echo "5. اضغط 'Deploy'"
echo ""
echo "6. بعد النشر، روح على Settings > Environment Variables"
echo "7. أضيف المتغيرات دي:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY" 
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - SUPABASE_JWT_SECRET"
echo ""
echo "8. في Settings > Domains، أضيف: madmonacairo.com"
echo ""
echo "🎉 خلاص! الموقع هيبقى شغال على madmonacairo.com"
