# Midnight Express LKN - Website

**Five Star Family Owned Airport Shuttle Service**

Professional, responsive static website for Midnight Express LKN, a premium airport shuttle service serving Denver, Sherrills Ford, and the Lake Norman region of North Carolina.

## Overview

This website provides:
- Complete business information and services
- Custom booking system with real-time validation
- Mobile-responsive design
- SEO optimization with Schema.org structured data
- Accessibility features (WCAG compliant)
- GitHub Pages deployment ready

## Features

### Custom Booking System

The core feature of this website is a comprehensive booking system that includes:

- **Real-time validation** - Instant feedback on form fields
- **Service area checking** - Validates pickup locations against service areas
- **Date/time validation** - Prevents bookings too far in advance or in the past (minimum 3 hours advance required)
- **Airport selection** - CLT, Concord Regional, and Private airports
- **Quote calculation** - Automatic fare estimation based on destination and passengers
- **LocalStorage persistence** - Bookings saved to browser storage (interim solution)
- **Mobile-optimized interface** - Touch-friendly inputs and responsive design
- **Accessibility features** - ARIA labels, keyboard navigation, screen reader support

### SEO & Performance

- **Comprehensive metadata** - Title, description, Open Graph, Twitter Cards
- **Schema.org structured data** - WebSite, Organization, and LocalBusiness markup
- **Sitemap.xml** - For search engine crawling
- **Robots.txt** - Search engine directives
- **Canonical URLs** - Prevent duplicate content issues
- **Optimized fonts** - Oswald for headings, Epilogue for body text

### Design & Responsiveness

- **Bootstrap 3 framework** - Proven, stable, well-supported
- **Mobile-first design** - Tested on 320px, 768px, 1024px, 1920px widths
- **Touch-friendly** - Large tap targets, appropriate spacing
- **Smooth scrolling** - Single-page application with section navigation
- **Professional branding** - Consistent teal (#18bc9c) and dark blue (#2c3e50) color scheme

## Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom styles with Bootstrap 3
- **JavaScript/jQuery** - Interactive functionality
- **Bootstrap 3** - Responsive grid and components
- **Font Awesome 4** - Icons
- **Google Fonts** - Oswald and Epilogue typefaces

## Directory Structure

```
/
├── index.html              # Main website page
├── 404.html                # Custom 404 error page
├── CNAME                   # Custom domain configuration
├── .nojekyll               # GitHub Pages directive
├── robots.txt              # Search engine directives
├── sitemap.xml             # XML sitemap
├── css/
│   ├── bootstrap.min.css   # Bootstrap framework
│   └── freelancer.css      # Custom styles
├── js/
│   ├── jquery.js           # jQuery library
│   ├── bootstrap.min.js    # Bootstrap JavaScript
│   ├── freelancer.js       # Theme JavaScript
│   ├── booking.js          # Custom booking system
│   └── contact_me.js       # Contact form handler
├── font-awesome/           # Icon font
├── fonts/                  # Web fonts
└── assets/
    └── images/             # Logo, favicon, and images
```

## Booking System Details

### How It Works

1. **User fills out booking form** with:
   - Name, phone, email
   - Pickup location (validated against service areas)
   - Destination airport
   - Date and time (validated for booking window)
   - Number of passengers
   - Optional special requests

2. **Real-time validation** as user fills form:
   - Service area checking
   - Date/time validation (3 hours minimum, 90 days maximum)
   - Email and phone format validation
   - Passenger count validation (1-10)

3. **Quote calculation** displayed automatically:
   - Base rates: CLT $85, Concord $65, Private $75
   - Additional passenger fee: $10 per person over 2
   - Disclaimer that final quote confirmed by phone

4. **Booking submission**:
   - Data validated comprehensively
   - Saved to browser localStorage with unique ID
   - Success message displayed with booking reference
   - User informed that booking will be confirmed by phone

5. **Admin access** (developer console):
   - `MidnightExpressBooking.getAllBookings()` - View all bookings
   - `MidnightExpressBooking.exportBookings()` - Download JSON file
   - `MidnightExpressBooking.clearAllBookings()` - Clear all data

### Service Areas Validated

- Denver
- Sherrills Ford
- Catawba
- Terrell
- Maiden
- Pumpkin Center
- Lincolnton
- Iron Station
- Lowesville
- Stanley County
- Lake Norman

### Booking Business Rules

- **Minimum advance booking**: 3 hours
- **Maximum advance booking**: 90 days
- **Maximum passengers**: 10 (form limits to 10, encourages phone call for larger groups)
- **Required fields**: Name, phone, email, passengers, pickup, destination, date, time
- **Optional fields**: Special requests

## Browser Support

- **Chrome** - Latest 2 versions
- **Firefox** - Latest 2 versions
- **Safari** - Latest 2 versions
- **Edge** - Latest 2 versions
- **Mobile Safari** - iOS 12+
- **Chrome Mobile** - Android 8+

## Accessibility

- **WCAG 2.1 Level AA** compliant
- **Semantic HTML** - Proper heading hierarchy, landmark regions
- **ARIA labels** - Screen reader support
- **Keyboard navigation** - All interactive elements accessible
- **Focus indicators** - Clear visual focus states
- **Color contrast** - Meets WCAG AA standards
- **Alt text** - All images have descriptive alt attributes

## SEO Features

### Metadata

- Title tag (under 60 characters)
- Meta description (under 160 characters)
- Open Graph tags (Facebook, LinkedIn)
- Twitter Card tags
- Canonical URL

### Schema.org Structured Data

Three JSON-LD blocks included:

1. **WebSite** - Basic site information
2. **Organization** - Business details, contact, social links
3. **LocalBusiness** - Address, hours, phone, business type

### Additional SEO

- Sitemap.xml for search engines
- Robots.txt to guide crawling
- Semantic HTML structure
- Mobile-responsive (Google ranking factor)
- Fast loading (optimized assets)

## Contact Forms

### Booking Form
- Custom validation and localStorage storage
- Real-time feedback
- Accessible and mobile-friendly

### Contact Form
- Uses Bootstrap validation
- Ready for backend integration (FormSpree, Netlify Forms, etc.)
- Currently configured for client-side validation only

## Important Notes

### Social Media Links
⚠️ The social media URLs in the footer are placeholders from the original Squarespace site:
- Facebook: `http://facebook.com/squarespace`
- Nextdoor: `http://Nextdoor.com/squarespace`
- Messenger: `http://Messenger.com/squarespace`

**ACTION REQUIRED**: Update these with actual social media URLs before deployment.

### Contact Form Backend
The contact form requires a backend service or third-party integration:
- FormSpree (recommended - free tier available)
- Netlify Forms (if hosting on Netlify)
- Custom backend solution

Currently, the form validates but doesn't submit anywhere.

### Booking System Limitation
The booking system uses **localStorage** for temporary storage. This means:
- ✅ Works without a backend
- ✅ No server costs
- ❌ Data only stored in user's browser
- ❌ Business cannot see bookings unless user shares booking ID

**Recommended**: Integrate with a backend service or booking platform when ready.

## Performance

- **Lightweight** - Minimal external dependencies
- **Optimized images** - Compressed and properly sized
- **Minified CSS/JS** - Reduced file sizes
- **CDN resources** - Fast delivery of common libraries
- **Lazy loading ready** - Can be added for images if needed

## Maintenance

### Regular Updates
- Update copyright year annually (currently 2025)
- Review and update content quarterly
- Check all links monthly
- Monitor Google Search Console for errors

### Analytics (Optional)
To add Google Analytics:
1. Sign up for Google Analytics
2. Add tracking code before `</head>` in index.html
3. Monitor traffic and user behavior

## Support

For issues or questions:
- **Email**: don@midnightexpresslkn.com
- **Phone**: (980) 422-9125

## License

© 2025 Midnight Express LKN. All Rights Reserved.

Template based on "Freelancer" by Start Bootstrap (Apache License 2.0)

## Deployment

See [deployment-guide.md](deployment-guide.md) for detailed GitHub Pages deployment instructions.
