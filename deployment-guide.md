# Midnight Express LKN - GitHub Pages Deployment Guide

Complete step-by-step guide to deploying the Midnight Express LKN website to GitHub Pages with a custom domain.

## Prerequisites

Before you begin, ensure you have:

- [ ] A GitHub account
- [ ] Git installed on your computer
- [ ] Access to the domain registrar for midnightexpresslkn.com
- [ ] All social media URLs verified and updated in index.html
- [ ] Test bookings completed successfully

## Part 1: GitHub Repository Setup

### Step 1: Create GitHub Repository

1. Log in to [GitHub](https://github.com)
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Repository settings:
   - **Name**: `midnightexpresslkn` (or any name you prefer)
   - **Description**: "Official website for Midnight Express LKN airport shuttle service"
   - **Visibility**: Public (required for free GitHub Pages)
   - **Initialize**: Do NOT initialize with README, .gitignore, or license
5. Click "Create repository"

### Step 2: Initialize Local Repository

Open Terminal/Command Prompt and navigate to your project directory:

```bash
cd /path/to/output/freelancer
```

Initialize Git repository:

```bash
git init
git add .
git commit -m "Initial commit: Midnight Express LKN website with custom booking system"
```

### Step 3: Connect to GitHub

Replace `YOUR-USERNAME` with your GitHub username and `REPO-NAME` with your repository name:

```bash
git remote add origin https://github.com/YOUR-USERNAME/REPO-NAME.git
git branch -M main
git push -u origin main
```

**Troubleshooting**: If you get an authentication error:
- Use a Personal Access Token instead of password
- Go to GitHub Settings > Developer settings > Personal access tokens > Generate new token
- Select "repo" scope
- Use the token as your password when pushing

## Part 2: Enable GitHub Pages

### Step 1: Configure GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll down to "Pages" section (left sidebar)
4. Under "Source":
   - **Branch**: Select `main`
   - **Folder**: Select `/ (root)`
5. Click "Save"

### Step 2: Wait for Deployment

- GitHub will automatically deploy your site
- This typically takes 1-3 minutes
- You'll see a message: "Your site is published at https://YOUR-USERNAME.github.io/REPO-NAME/"
- Click the URL to verify the site works

### Step 3: Test the Deployed Site

Visit your GitHub Pages URL and test:

- [ ] All sections load correctly
- [ ] Navigation links work
- [ ] Booking form displays and validates
- [ ] Contact information is clickable
- [ ] Mobile responsive (resize browser window)
- [ ] All images load
- [ ] Forms validate properly

## Part 3: Custom Domain Configuration

### Step 1: Configure DNS Records

Log in to your domain registrar (e.g., GoDaddy, Namecheap, Google Domains) and add these DNS records:

**Option A: Using www subdomain (Recommended)**

| Type  | Name | Value                       | TTL  |
|-------|------|-----------------------------|------|
| CNAME | www  | YOUR-USERNAME.github.io     | 3600 |
| A     | @    | 185.199.108.153             | 3600 |
| A     | @    | 185.199.109.153             | 3600 |
| A     | @    | 185.199.110.153             | 3600 |
| A     | @    | 185.199.111.153             | 3600 |

**Option B: Apex domain only (midnightexpresslkn.com)**

| Type | Name | Value           | TTL  |
|------|------|-----------------|------|
| A    | @    | 185.199.108.153 | 3600 |
| A    | @    | 185.199.109.153 | 3600 |
| A    | @    | 185.199.110.153 | 3600 |
| A    | @    | 185.199.111.153 | 3600 |

**Note**: DNS changes can take 24-48 hours to propagate, but typically take 1-2 hours.

### Step 2: Configure Custom Domain in GitHub

1. Go to your repository on GitHub
2. Click "Settings" > "Pages"
3. Under "Custom domain":
   - Enter: `www.midnightexpresslkn.com`
   - Click "Save"
4. GitHub will check DNS configuration
5. Wait for the DNS check to complete (may take a few minutes)

### Step 3: Enable HTTPS

1. In the same GitHub Pages settings
2. Check the box: "Enforce HTTPS"
3. Wait for SSL certificate to be provisioned (can take up to 24 hours)
4. Once enabled, all traffic will be redirected to HTTPS

**Important**: You may need to wait for DNS propagation before HTTPS can be enabled.

## Part 4: Verification & Testing

### Step 1: Verify Domain Configuration

Use these tools to check DNS propagation:

1. **DNS Checker**: https://dnschecker.org/
   - Enter: `www.midnightexpresslkn.com`
   - Check that CNAME points to your GitHub Pages URL

2. **What's My DNS**: https://www.whatsmydns.net/
   - Verify DNS records globally

3. **Command Line** (Terminal/Command Prompt):
   ```bash
   nslookup www.midnightexpresslkn.com
   ```

### Step 2: Test Custom Domain

Visit both:
- http://www.midnightexpresslkn.com
- https://www.midnightexpresslkn.com

Verify:
- [ ] Site loads correctly
- [ ] HTTPS is enabled (padlock icon in browser)
- [ ] Certificate is valid (click padlock to check)
- [ ] All links and resources load (no mixed content warnings)

### Step 3: Comprehensive Site Testing

#### Desktop Testing
Test on at least two browsers (Chrome, Firefox, Safari, or Edge):

- [ ] Home/Hero section displays correctly
- [ ] Logo appears in navigation
- [ ] All navigation links scroll to correct sections
- [ ] Services icons and text display
- [ ] Why Choose Us section readable
- [ ] About Us section loads
- [ ] Areas Served section displays all areas
- [ ] **Booking form**:
  - [ ] All fields display correctly
  - [ ] Date picker works
  - [ ] Time picker works
  - [ ] Service area validation works
  - [ ] Quote calculation displays
  - [ ] Form submission stores booking
  - [ ] Success message appears
- [ ] Contact section displays contact info
- [ ] Contact form validates
- [ ] Footer information correct
- [ ] Scroll to top button works
- [ ] Phone links are clickable (use mobile or Skype)
- [ ] Email links open mail client

#### Mobile Testing
Test on actual mobile devices or browser DevTools mobile emulation:

**320px (Small Phone)**
- [ ] Text is readable (not too small)
- [ ] Buttons are tap-friendly
- [ ] Forms are usable
- [ ] Navigation menu works
- [ ] No horizontal scrolling

**768px (Tablet)**
- [ ] Layout adapts appropriately
- [ ] Images scale correctly
- [ ] Multi-column sections display well

**1024px+ (Desktop)**
- [ ] Full desktop layout displays
- [ ] All sections use available space
- [ ] Navigation bar fixed at top

#### Booking System Testing

Complete a test booking with these scenarios:

**Valid Booking**:
- Name: "Test User"
- Phone: "(980) 555-1234"
- Email: "test@example.com"
- Passengers: 3
- Pickup: "7740 Marlette Ln, Sherrills Ford, NC"
- Destination: "CLT"
- Date: Tomorrow
- Time: 10:00 AM

Expected result:
- [ ] Form accepts all input
- [ ] Quote displays ($105 for 3 passengers)
- [ ] Success message appears
- [ ] Booking reference generated

**Invalid Booking - Service Area**:
- Pickup: "123 Main St, Charlotte, NC"

Expected result:
- [ ] Warning message about service area
- [ ] User advised to call

**Invalid Booking - Timing**:
- Date: Today
- Time: 30 minutes from now

Expected result:
- [ ] Error message about 3-hour minimum
- [ ] User advised to call for urgent bookings

**Developer Console Check**:
Open browser console (F12) and run:
```javascript
MidnightExpressBooking.getAllBookings()
```

Expected result:
- [ ] Array of booking objects displayed
- [ ] All booking data present

### Step 4: SEO Verification

#### Google Rich Results Test
1. Go to: https://search.google.com/test/rich-results
2. Enter: https://www.midnightexpresslkn.com
3. Click "Test URL"
4. Verify:
   - [ ] No errors
   - [ ] WebSite schema detected
   - [ ] Organization schema detected
   - [ ] LocalBusiness schema detected

#### Schema Markup Validator
1. Go to: https://validator.schema.org/
2. Enter URL: https://www.midnightexpresslkn.com
3. Verify:
   - [ ] All three Schema.org blocks validate
   - [ ] No warnings or errors

#### Open Graph Preview
Test social sharing previews:
1. **Facebook**: https://developers.facebook.com/tools/debug/
   - Enter URL
   - Check preview image and text
2. **LinkedIn**: https://www.linkedin.com/post-inspector/
   - Enter URL
   - Verify preview
3. **Twitter**: https://cards-dev.twitter.com/validator
   - Enter URL
   - Check card preview

#### Mobile-Friendly Test
1. Go to: https://search.google.com/test/mobile-friendly
2. Enter: https://www.midnightexpresslkn.com
3. Verify:
   - [ ] Page is mobile-friendly
   - [ ] No mobile usability issues

### Step 5: Performance Testing

#### PageSpeed Insights
1. Go to: https://pagespeed.web.dev/
2. Enter: https://www.midnightexpresslkn.com
3. Check scores:
   - Target: 90+ on mobile
   - Target: 95+ on desktop
4. Review and address any recommendations

#### Load Time
Use browser DevTools Network tab:
- [ ] Initial load < 3 seconds
- [ ] DOMContentLoaded < 2 seconds
- [ ] All resources load successfully

## Part 5: Post-Deployment Tasks

### Step 1: Submit to Search Engines

#### Google Search Console
1. Go to: https://search.google.com/search-console
2. Click "Add Property"
3. Enter: `https://www.midnightexpresslkn.com`
4. Verify ownership (choose DNS or HTML file method)
5. Submit sitemap:
   - Click "Sitemaps" in left menu
   - Enter: `https://www.midnightexpresslkn.com/sitemap.xml`
   - Click "Submit"

#### Bing Webmaster Tools
1. Go to: https://www.bing.com/webmasters
2. Add site: `https://www.midnightexpresslkn.com`
3. Verify ownership
4. Submit sitemap: `https://www.midnightexpresslkn.com/sitemap.xml`

### Step 2: Set Up Analytics (Optional)

#### Google Analytics 4
1. Go to: https://analytics.google.com/
2. Create account and property
3. Get Measurement ID (format: G-XXXXXXXXXX)
4. Add to index.html before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

5. Commit and push changes:
```bash
git add index.html
git commit -m "Add Google Analytics"
git push
```

### Step 3: Set Up Google My Business

1. Go to: https://www.google.com/business/
2. Add business location
3. Verify business (postcard, phone, or email)
4. Add:
   - Business hours: 24/7
   - Phone: (980) 422-9125
   - Website: https://www.midnightexpresslkn.com
   - Service areas: All areas from website
   - Photos: Logo, vehicles, service area map
   - Services: Airport shuttle services

### Step 4: Configure Email for Bookings

Since bookings are stored in localStorage, set up a system to retrieve them:

**Option 1: Manual Check**
- Provide instructions to staff to use browser console
- Run: `MidnightExpressBooking.exportBookings()`

**Option 2: Integrate with Backend (Recommended)**
- Set up a backend service (Node.js, Python, PHP)
- Modify booking.js to POST to your backend
- Store bookings in a database
- Send email notifications

**Option 3: Third-Party Service**
- Use services like FormSpree, Basin, or Formkeep
- Integrate with booking form
- Receive email notifications for each booking

### Step 5: Social Media Integration

1. Update social media URLs in index.html:
   - Replace placeholder Facebook URL
   - Replace placeholder Nextdoor URL
   - Replace placeholder Messenger URL

2. Create social media posts announcing new website:
   - Share: https://www.midnightexpresslkn.com
   - Mention booking system
   - Include call to action

## Part 6: Ongoing Maintenance

### Regular Tasks

**Daily**
- Monitor for booking issues
- Respond to contact form submissions
- Check booking localStorage data

**Weekly**
- Review Google Analytics (if installed)
- Check for broken links
- Monitor site performance

**Monthly**
- Update content as needed
- Review and respond to online reviews
- Check SEO performance in Search Console

**Quarterly**
- Update testimonials (when feature added)
- Review and optimize for new keywords
- Update service areas if expanded

**Annually**
- Update copyright year in footer
- Renew domain registration
- Review and update all content for accuracy

### Making Updates

To update the website:

1. Make changes to local files
2. Test changes locally (open index.html in browser)
3. Commit changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. Wait 1-3 minutes for GitHub Pages to rebuild
5. Verify changes at https://www.midnightexpresslkn.com

### Backup

Create regular backups:

1. **GitHub automatically backs up** your code
2. **Export bookings regularly**:
   - Open browser console
   - Run: `MidnightExpressBooking.exportBookings()`
   - Save JSON file to safe location
3. **Clone repository** to multiple locations:
   ```bash
   git clone https://github.com/YOUR-USERNAME/REPO-NAME.git
   ```

## Troubleshooting

### Custom Domain Not Working

**Symptom**: www.midnightexpresslkn.com doesn't load

**Solutions**:
1. Check DNS propagation: https://dnschecker.org/
2. Verify CNAME file exists in repository
3. Check GitHub Pages settings has correct domain
4. Wait 24-48 hours for DNS to fully propagate
5. Clear browser cache and try incognito mode

### HTTPS Not Available

**Symptom**: Cannot enable "Enforce HTTPS" checkbox

**Solutions**:
1. Wait for DNS to fully propagate (up to 48 hours)
2. Remove and re-add custom domain in GitHub Pages settings
3. Check that DNS records are correct
4. Try disabling/re-enabling HTTPS after 24 hours

### Booking Form Not Working

**Symptom**: Form doesn't validate or submit

**Solutions**:
1. Open browser console (F12) and check for errors
2. Verify booking.js is loading (check Network tab)
3. Test in incognito mode (extensions can interfere)
4. Try different browser
5. Clear browser cache and localStorage

### Images Not Loading

**Symptom**: Broken image links

**Solutions**:
1. Verify images are in /assets/images/ directory
2. Check image file names match HTML references
3. Ensure images were included in git commit
4. Check browser console for 404 errors
5. Verify paths are relative, not absolute

### Contact Form Not Sending

**Symptom**: Contact form validates but doesn't send email

**Note**: This is expected behavior. The contact form needs a backend:
1. Integrate with FormSpree, Netlify Forms, or similar
2. Or set up custom backend to handle submissions
3. Update form action attribute and JavaScript accordingly

## Support Resources

### GitHub Pages Documentation
- https://docs.github.com/en/pages

### Custom Domain Setup
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

### DNS Configuration Help
- Contact your domain registrar's support
- Most provide live chat or phone support

### General Web Development
- MDN Web Docs: https://developer.mozilla.org/
- Stack Overflow: https://stackoverflow.com/

## Checklist: Deployment Complete

Before considering deployment complete, verify:

- [ ] Repository created on GitHub
- [ ] All files pushed to GitHub
- [ ] GitHub Pages enabled
- [ ] Site accessible at GitHub Pages URL
- [ ] DNS records configured at domain registrar
- [ ] Custom domain configured in GitHub
- [ ] HTTPS enabled and working
- [ ] Site loads at https://www.midnightexpresslkn.com
- [ ] All social media URLs updated (not placeholders)
- [ ] Mobile responsive verified on real devices
- [ ] Booking form tested and working
- [ ] Contact information tested (phone/email links)
- [ ] Submitted to Google Search Console
- [ ] Submitted to Bing Webmaster Tools
- [ ] Sitemap submitted to search engines
- [ ] Google My Business set up
- [ ] Analytics installed (optional)
- [ ] All links tested and working
- [ ] Images loading correctly
- [ ] Schema.org markup validated
- [ ] Open Graph preview tested
- [ ] Performance tested (PageSpeed Insights)
- [ ] README.md reviewed
- [ ] Staff trained on booking system
- [ ] Backup procedure established
- [ ] Social media announcement posted

## Success!

Congratulations! Your Midnight Express LKN website is now live at:

**https://www.midnightexpresslkn.com**

The professional, mobile-responsive site is ready to serve your customers with its custom booking system.

For questions or issues, contact:
- **Email**: don@midnightexpresslkn.com
- **Phone**: (980) 422-9125
