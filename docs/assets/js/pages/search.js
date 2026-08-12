/**
 * search.js — Enterprise Search page controller (SEARCH-001-P1)
 *
 * Client-side demo only. Filters a static dataset.
 * Future: replace dataset with WP REST API / search index.
 *
 * URL contract: /search/
 */

/* =========================================================
   STATIC DATASET
   One entry per page. Future CMS integration replaces this.
   Fields: title, description, url, category, keywords
   ========================================================= */
const PAGES = [
  {
    title:       'Homepage',
    description: 'Laborate Pharmaceuticals India Ltd. — global pharmaceutical manufacturing and healthcare solutions.',
    url:         'index.html',
    canonical:   '//',
    category:    'Company',
    keywords:    'home laborate pharmaceuticals india overview',
  },
  {
    title:       'About Us',
    description: 'Company overview, leadership, history, and mission of Laborate Pharmaceuticals.',
    url:         'about.html',
    canonical:   '/about/',
    category:    'About',
    keywords:    'about company overview history mission vision',
  },
  {
    title:       'Leadership',
    description: 'Meet the executive leadership team at Laborate Pharmaceuticals.',
    url:         'about/leadership.html',
    canonical:   '/about/leadership/',
    category:    'About',
    keywords:    'leadership team executives management board',
  },
  {
    title:       'Awards & Recognition',
    description: 'Industry awards and recognitions received by Laborate Pharmaceuticals.',
    url:         'about/awards.html',
    canonical:   '/about/awards/',
    category:    'About',
    keywords:    'awards recognition honours achievements certificates',
  },
  {
    title:       'Why Laborate',
    description: 'The Laborate difference — quality, compliance, and global reach.',
    url:         'about/why-laborate.html',
    canonical:   '/about/why-laborate/',
    category:    'About',
    keywords:    'why laborate difference quality gmp certified',
  },
  {
    title:       'Products Overview',
    description: 'Explore Laborate\'s pharmaceutical product portfolio across therapeutic areas.',
    url:         'products.html',
    canonical:   '/products/',
    category:    'Products',
    keywords:    'products pharma medicine drug formulation portfolio tablets capsules',
  },
  {
    title:       'Product Catalogue',
    description: 'Browse and filter the complete Laborate pharmaceutical product catalogue.',
    url:         'products/catalogue.html',
    canonical:   '/products/catalogue/',
    category:    'Products',
    keywords:    'catalogue product list filter therapy dosage antibiotics cardiovascular',
  },
  {
    title:       'Brands',
    description: 'Laborate\'s six flagship pharmaceutical brands including Elite, Elite Exotic, GPP Axalade, AquaLab, and more.',
    url:         'brands.html',
    canonical:   '/brands/',
    category:    'Products',
    keywords:    'brands elite aquaLab labolia GPP axalade portfolio',
  },
  {
    title:       'Manufacturing',
    description: 'WHO-GMP certified manufacturing facilities and capabilities.',
    url:         'manufacturing.html',
    canonical:   '/manufacturing/',
    category:    'Manufacturing',
    keywords:    'manufacturing facilities GMP certified plants production',
  },
  {
    title:       'Manufacturing Network',
    description: 'Laborate\'s manufacturing plant locations across India.',
    url:         'manufacturing-plants.html',
    canonical:   '/manufacturing/plants/',
    category:    'Manufacturing',
    keywords:    'plants locations panipat facilities network map',
  },
  {
    title:       'Quality & Compliance',
    description: 'Quality systems, certifications, and regulatory compliance at Laborate.',
    url:         'quality.html',
    canonical:   '/quality/',
    category:    'Quality',
    keywords:    'quality compliance GMP ISO certifications audits regulatory',
  },
  {
    title:       'Global Presence',
    description: 'Laborate\'s international supply network across 35+ markets.',
    url:         'global.html',
    canonical:   '/global/',
    category:    'Global',
    keywords:    'global international exports markets countries regions',
  },
  {
    title:       'Global Map',
    description: 'Interactive world map showing Laborate\'s global distribution and partnerships.',
    url:         'global/map.html',
    canonical:   '/global/map/',
    category:    'Global',
    keywords:    'map world global interactive countries distribution',
  },
  {
    title:       'Business Opportunities',
    description: 'CDMO, contract manufacturing, institutional supply, and international distribution partnerships.',
    url:         'business.html',
    canonical:   '/business/',
    category:    'Business',
    keywords:    'business CDMO contract manufacturing distribution partnerships alliances institutional',
  },
  {
    title:       'Media Centre',
    description: 'Latest news, press releases, events, and social media from Laborate Pharmaceuticals.',
    url:         'media.html',
    canonical:   '/media/',
    category:    'Media',
    keywords:    'media news press releases events announcements',
  },
  {
    title:       'Press Releases',
    description: 'Official press releases from Laborate Pharmaceuticals.',
    url:         'media/press-releases.html',
    canonical:   '/media/press-releases/',
    category:    'Media',
    keywords:    'press releases statements announcements official',
  },
  {
    title:       'News & Announcements',
    description: 'Latest news and announcements from Laborate Pharmaceuticals.',
    url:         'media/news.html',
    canonical:   '/media/news/',
    category:    'Media',
    keywords:    'news announcements updates company',
  },
  {
    title:       'Events & Exhibitions',
    description: 'Upcoming and past pharmaceutical industry events attended by Laborate.',
    url:         'media/events.html',
    canonical:   '/media/events/',
    category:    'Media',
    keywords:    'events exhibitions conferences trade shows pharma',
  },
  {
    title:       'Social Media',
    description: 'Laborate Pharmaceuticals on LinkedIn, Facebook, and Instagram.',
    url:         'media/social.html',
    canonical:   '/media/social/',
    category:    'Media',
    keywords:    'social media linkedin facebook instagram',
  },
  {
    title:       'Resources & Downloads',
    description: 'Technical documents, brochures, certifications, and downloadable resources.',
    url:         'resources.html',
    canonical:   '/resources/',
    category:    'Resources',
    keywords:    'resources downloads documents brochures certificates dossier',
  },
  {
    title:       'Careers',
    description: 'Join the Laborate team — current openings and career opportunities.',
    url:         'careers.html',
    canonical:   '/careers/',
    category:    'Careers',
    keywords:    'careers jobs vacancies employment opportunities',
  },
  {
    title:       'Contact Us',
    description: 'Get in touch with Laborate Pharmaceuticals — sales, business, medical, and general enquiries.',
    url:         'contact.html',
    canonical:   '/contact/',
    category:    'Company',
    keywords:    'contact phone email address enquiry support',
  },
  {
    title:       'Legal & Compliance Hub',
    description: 'Laborate\'s legal documents, policies, and compliance notices.',
    url:         'legal.html',
    canonical:   '/legal/',
    category:    'Legal',
    keywords:    'legal compliance policies documents hub',
  },
  {
    title:       'Privacy Policy',
    description: 'How Laborate collects, uses, and protects your personal data.',
    url:         'privacy-policy.html',
    canonical:   '/privacy-policy/',
    category:    'Legal',
    keywords:    'privacy policy data protection GDPR personal information',
  },
  {
    title:       'Terms & Conditions',
    description: 'Terms and conditions governing use of the Laborate website.',
    url:         'terms-and-conditions.html',
    canonical:   '/terms-and-conditions/',
    category:    'Legal',
    keywords:    'terms conditions website use agreement',
  },
  {
    title:       'Cookie Policy',
    description: 'How Laborate uses cookies and your cookie preferences.',
    url:         'cookie-policy.html',
    canonical:   '/cookie-policy/',
    category:    'Legal',
    keywords:    'cookies cookie policy consent preferences analytics',
  },
  {
    title:       'Disclaimer',
    description: 'Website disclaimer covering medical information, product data, and liability.',
    url:         'disclaimer.html',
    canonical:   '/disclaimer/',
    category:    'Legal',
    keywords:    'disclaimer medical liability accuracy information',
  },
  {
    title:       'Accessibility Statement',
    description: 'Laborate\'s commitment to digital accessibility and WCAG 2.2 AA alignment.',
    url:         'accessibility-statement.html',
    canonical:   '/accessibility/',
    category:    'Legal',
    keywords:    'accessibility WCAG statement commitment disability',
  },
  {
    title:       'Website Sitemap',
    description: 'Complete navigation guide to all pages on the Laborate website.',
    url:         'sitemap.html',
    canonical:   '/sitemap/',
    category:    'Company',
    keywords:    'sitemap all pages navigation guide',
  },
];

/* =========================================================
   [CMS: FUTURE INTEGRATION PLACEHOLDER]
   Replace PAGES array with a WP REST API call:

   async function fetchResults(query) {
     const res = await fetch(`/wp-json/ocp/v1/search?q=${encodeURIComponent(query)}`);
     return res.json(); // { results: [{ title, description, url, category }] }
   }

   Indexed entity types (future):
   - Products        (CPT: ocp_product)
   - Resources       (CPT: ocp_resource)
   - Press Releases  (CPT: ocp_press_release)
   - News            (CPT: post)
   - Events          (CPT: ocp_event)
   - Careers         (CPT: ocp_job)
   - Brands          (CPT: ocp_brand)
   - Therapeutic Areas (taxonomy: ocp_therapy)
   - Facilities      (CPT: ocp_facility)
   - People          (CPT: ocp_person)
   - Documents       (CPT: ocp_document)
   - CMS pages       (post_type: page)
   ========================================================= */


/* =========================================================
   SEARCH ENGINE (client-side demo)
   ========================================================= */

/**
 * Filter dataset by query string.
 * Case-insensitive, partial match across title + description + keywords + category.
 * Returns all results if query is empty.
 */
function filterPages(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return PAGES.filter(page => {
    const haystack = [
      page.title,
      page.description,
      page.keywords,
      page.category,
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}


/* =========================================================
   RENDER
   ========================================================= */

const container  = document.getElementById('sch-results-container');
const countEl    = document.getElementById('sch-results-count');
const stateEl    = document.getElementById('sch-results-state');

function renderEmpty() {
  if (stateEl) stateEl.hidden = false;
  if (countEl) countEl.hidden = true;
  if (container) container.innerHTML = '';
}

function renderNoResults(query) {
  if (stateEl) {
    stateEl.hidden = false;
    const msg = stateEl.querySelector('.sch-state-message');
    if (msg) msg.textContent = `No results found for "${query}".`;
  }
  if (countEl) countEl.hidden = true;
  if (container) container.innerHTML = '';
}

function renderResults(results, query) {
  if (!container) return;

  if (stateEl) stateEl.hidden = true;

  if (countEl) {
    countEl.hidden = false;
    countEl.textContent = results.length === 1
      ? `1 result for "${query}"`
      : `${results.length} results for "${query}"`;
  }

  container.innerHTML = results.map(page => `
    <article class="sch-result-card reveal">
      <span class="sch-result-category">${escHtml(page.category)}</span>
      <h3 class="sch-result-title">
        <a href="${escAttr(page.url)}">${escHtml(page.title)}</a>
      </h3>
      <p class="sch-result-desc">${escHtml(page.description)}</p>
      <span class="sch-result-url" aria-hidden="true">${escHtml(page.canonical)}</span>
    </article>
  `).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}


/* =========================================================
   FORM WIRING
   ========================================================= */

const form  = document.getElementById('sch-form');
const input = document.getElementById('sch-input');

if (form && input) {
  /* Pre-fill from URL ?q= on page load */
  const params = new URLSearchParams(window.location.search);
  const initial = params.get('q') || '';
  if (initial) {
    input.value = initial;
    const results = filterPages(initial);
    if (results.length) {
      renderResults(results, initial);
    } else {
      renderNoResults(initial);
    }
  } else {
    renderEmpty();
  }

  /* Submit handler */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();

    /* Update URL without reload for shareability */
    const url = new URL(window.location);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState({}, '', url);

    if (!query) {
      renderEmpty();
      return;
    }

    const results = filterPages(query);
    if (results.length) {
      renderResults(results, query);
    } else {
      renderNoResults(query);
    }

    /* Announce to screen readers */
    container?.setAttribute('aria-label',
      results.length
        ? `${results.length} search results`
        : 'No search results'
    );

    /* Scroll to results */
    document.getElementById('sch-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* Clear on empty input (live UX) */
  input.addEventListener('input', () => {
    if (!input.value.trim()) renderEmpty();
  });
}
