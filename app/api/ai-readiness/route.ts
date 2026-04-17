import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { writeFile } from 'node:fs/promises';

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!
});

interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  score: number;
  details: string;
  recommendation: string;
}

// Calculate Flesch-Kincaid readability score
function calculateReadability(text: string): number {
  // Simple approximation of Flesch Reading Ease
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((acc, word) => {
    // Simple syllable counting: count vowel groups
    return acc + (word.match(/[aeiouAEIOU]+/g) || []).length || 1;
  }, 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  // Flesch Reading Ease formula
  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
}

// Extract text content from HTML
function extractTextContent(html: string): string {
  // Remove script and style tags (using [\s\S] instead of . with s flag)
  let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags
  cleanHtml = cleanHtml.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  cleanHtml = cleanHtml.replace(/&nbsp;/g, ' ');
  cleanHtml = cleanHtml.replace(/&amp;/g, '&');
  cleanHtml = cleanHtml.replace(/&lt;/g, '<');
  cleanHtml = cleanHtml.replace(/&gt;/g, '>');
  cleanHtml = cleanHtml.replace(/&quot;/g, '"');
  cleanHtml = cleanHtml.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  return cleanHtml.replace(/\s+/g, ' ').trim();
}

async function analyzeHTML(html: string, metadata: any, url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  
  console.log('[AI-READY] HTML Check 1/5: Extracting text content...');
  const textContent = extractTextContent(html);
  
  console.log('[AI-READY] HTML Check 2/5: Analyzing heading structure...');
  // 1. Heading Structure (High Signal)
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  const headings = html.match(/<h([1-6])[^>]*>/gi) || [];
  const headingLevels = headings.map(h => parseInt(h.match(/<h([1-6])/i)?.[1] || '0'));
  
  let headingScore = 100;
  let headingIssues: string[] = [];
  
  // Check for single H1
  if (h1Count === 0) {
    headingScore -= 40;
    headingIssues.push('Ingen H1 fundet');
  } else if (h1Count > 1) {
    headingScore -= 30;
    headingIssues.push(`Flere H1 (${h1Count}) gør emnet tvetydigt`);
  }
  
  // Check heading hierarchy
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] - headingLevels[i-1] > 1) {
      headingScore -= 15;
      headingIssues.push(`Overskriftsniveau sprunget over (H${headingLevels[i-1]} → H${headingLevels[i]})`);
    }
  }
  
  headingScore = Math.max(0, headingScore);
  
  results.push({
    id: 'heading-structure',
    label: 'Overskriftshierarki',
    status: headingScore >= 80 ? 'pass' : headingScore >= 50 ? 'warning' : 'fail',
    score: headingScore,
    details: headingIssues.length > 0 ? headingIssues.join(', ') : `Perfekt hierarki med ${h1Count} H1 og logisk struktur`,
    recommendation: headingScore < 80 ? 
      'Brug præcis én H1, og bevar et logisk overskriftshierarki (H1→H2→H3)' : 
      'Fremragende overskriftsstruktur til AI-forståelse'
  });
  
  console.log('[AI-READY] HTML Check 3/5: Calculating readability score...');
  // 3. Readability Score (High Signal)
  const readabilityScore = calculateReadability(textContent);
  let readabilityStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let readabilityDetails = '';
  let normalizedScore = 0;
  
  if (readabilityScore >= 70) {
    normalizedScore = 100;
    readabilityStatus = 'pass';
    readabilityDetails = `Meget læsbar (Flesch: ${Math.round(readabilityScore)})`;
  } else if (readabilityScore >= 50) {
    normalizedScore = 80;
    readabilityStatus = 'pass';
    readabilityDetails = `God læsbarhed (Flesch: ${Math.round(readabilityScore)})`;
  } else if (readabilityScore >= 30) {
    normalizedScore = 50;
    readabilityStatus = 'warning';
    readabilityDetails = `Svær at læse (Flesch: ${Math.round(readabilityScore)})`;
  } else {
    normalizedScore = 20;
    readabilityStatus = 'fail';
    readabilityDetails = `Meget svær (Flesch: ${Math.round(readabilityScore)})`;
  }
  
  results.push({
    id: 'readability',
    label: 'Læsbarhed',
    status: readabilityStatus,
    score: normalizedScore,
    details: readabilityDetails,
    recommendation: normalizedScore < 80 ? 
      'Forenkl sætninger og brug et klarere sprog for bedre AI-forståelse' : 
      'Indholdet er klart skrevet og AI-venligt'
  });
  
  console.log('[AI-READY] HTML Check 4/5: Checking metadata quality...');
  // 4. Enhanced Metadata Quality (Medium Signal)
  const hasOgTitle = metadata?.ogTitle || metadata?.title || html.includes('og:title') || html.includes('<title');
  const hasOgDescription = metadata?.ogDescription || metadata?.description || html.includes('og:description') || html.includes('name="description"');
  
  // Check description quality — target meta description specifically, regardless of attribute order
  const descMatch =
    html.match(/name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const descLength = descMatch?.[1]?.length || 0;
  const hasGoodDescLength = descLength >= 70 && descLength <= 160;

  const hasCanonical = html.includes('rel="canonical"');
  // Check for author in HTML meta tags or JSON-LD structured data
  const hasAuthor = html.includes('name="author"') || html.includes('property="article:author"') || html.includes('"author"') || html.includes('"publisher"');
  const hasPublishDate = html.includes('property="article:published_time"') || html.includes('property="article:modified_time"');
  
  // Enhanced scoring - be more generous
  let metaScore = 30; // Base score for having a page
  let metaDetails: string[] = [];
  
  if (hasOgTitle) {
    metaScore += 30;
    metaDetails.push('Titel ✓');
  } else if (html.includes('<title')) {
    metaScore += 20;
    metaDetails.push('Grundlæggende titel');
  }
  
  if (hasOgDescription) {
    metaScore += 25;
    if (hasGoodDescLength) {
      metaScore += 10;
      metaDetails.push('Beskrivelse ✓');
    } else {
      metaDetails.push('Beskrivelse');
    }
  }
  
  if (hasAuthor) {
    metaScore += 10;
    metaDetails.push('Forfatter ✓');
  }
  if (hasPublishDate) {
    metaScore += 10;
    metaDetails.push('Dato ✓');
  }
  
  // Cap at 100
  metaScore = Math.min(100, metaScore);
  results.push({
    id: 'meta-tags',
    label: 'Metadata-kvalitet',
    status: metaScore >= 70 ? 'pass' : metaScore >= 40 ? 'warning' : 'fail',
    score: metaScore,
    details: metaDetails.length > 0 ? metaDetails.join(', ') : 'Mangler vigtig metadata',
    recommendation: metaScore < 70 ? 
      'Tilføj titel, beskrivelse (70–160 tegn), forfatter og udgivelsesdato' : 
      'Metadata giver fremragende kontekst til AI'
  });
  
  console.log('[AI-READY] HTML Check 5/5: Checking semantic HTML and accessibility...');
  // 6. Semantic HTML (Medium Signal)
  const semanticTags = ['<article', '<nav', '<main', '<section', '<header', '<footer', '<aside'];
  const semanticCount = semanticTags.filter(tag => html.includes(tag)).length;
  
  // Modern SPAs might use divs with proper ARIA roles
  const hasAriaRoles = html.includes('role="') || html.includes('aria-');
  const isModernFramework = html.includes('__next') || html.includes('_app') || html.includes('react') || html.includes('vue') || html.includes('svelte');
  
  const semanticScore = Math.min(100, 
    (semanticCount / 5) * 60 + 
    (hasAriaRoles ? 20 : 0) + 
    (isModernFramework ? 20 : 0));
  
  results.push({
    id: 'semantic-html',
    label: 'Semantisk HTML',
    status: semanticScore >= 80 ? 'pass' : semanticScore >= 40 ? 'warning' : 'fail',
    score: semanticScore,
    details: `Fundet ${semanticCount} semantiske HTML5-elementer`,
    recommendation: semanticScore < 80 ? 'Brug flere semantiske HTML5-elementer (article, nav, main, section osv.)' : 'Fremragende brug af semantisk HTML'
  });
  
  // 7. Check accessibility (Lower Signal but still important)
  const hasAltText = (html.match(/alt="/g) || []).length;
  const imgCount = (html.match(/<img/g) || []).length;
  const altTextRatio = imgCount > 0 ? (hasAltText / imgCount) * 100 : 100;
  const hasAriaLabels = html.includes('aria-label');
  const hasAriaDescribedBy = html.includes('aria-describedby');
  const hasRole = html.includes('role="');
  const hasLangAttribute = html.includes('lang="');
  
  // Sites with no images shouldn't be penalized
  const imageScore = imgCount === 0 ? 40 : (altTextRatio * 0.4);
  
  const accessibilityScore = Math.min(100, 
    imageScore + 
    (hasAriaLabels ? 20 : 0) + 
    (hasAriaDescribedBy ? 10 : 0) + 
    (hasRole ? 15 : 0) + 
    (hasLangAttribute ? 15 : 0));
  
  results.push({
    id: 'accessibility',
    label: 'Tilgængelighed',
    status: accessibilityScore >= 80 ? 'pass' : accessibilityScore >= 50 ? 'warning' : 'fail',
    score: Math.round(accessibilityScore),
    details: `${Math.round(altTextRatio)}% af billeder har alt-tekst, ARIA-labels: ${hasAriaLabels ? 'Ja' : 'Nej'}`,
    recommendation: accessibilityScore < 80 ? 'Tilføj alt-tekst til alle billeder, og brug ARIA-labels til interaktive elementer' : 'God tilgængelighedsimplementering'
  });
  return results;
}

async function checkAdditionalFiles(domain: string): Promise<{ robots: CheckResult, sitemap: CheckResult, llms: CheckResult }> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const cleanUrl = new URL(baseUrl).origin;
  
  // Helper function to fetch with timeout
  const fetchWithTimeout = async (url: string, timeout = 3000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
  
  // Define default results
  let robotsCheck: CheckResult = {
    id: 'robots-txt',
    label: 'Robots.txt',
    status: 'fail',
    score: 0,
    details: 'Ingen robots.txt-fil fundet',
    recommendation: 'Opret en robots.txt-fil med direktiver til AI-crawlere'
  };
  
  let sitemapCheck: CheckResult = {
    id: 'sitemap',
    label: 'Sitemap',
    status: 'fail',
    score: 0,
    details: 'Ingen sitemap.xml fundet',
    recommendation: 'Generér og indsend en XML-sitemap'
  };
  
  let llmsCheck: CheckResult = {
    id: 'llms-txt',
    label: 'LLMs.txt',
    status: 'fail',
    score: 0,
    details: 'Ingen llms.txt-fil fundet',
    recommendation: 'Tilføj en llms.txt-fil for at definere AI-tilladelser'
  };
  
  // Store robots.txt content for sitemap extraction
  let robotsText = '';
  let sitemapUrls: string[] = [];
  
  // Create all fetch promises in parallel
  const promises = [
    // Check robots.txt
    fetchWithTimeout(`${cleanUrl}/robots.txt`)
      .then(async (response) => {
        if (response.ok) {
          robotsText = await response.text();
          const hasUserAgent = robotsText.toLowerCase().includes('user-agent');
          
          // Extract sitemap URLs from robots.txt
          const sitemapMatches = robotsText.match(/Sitemap:\s*(.+)/gi);
          if (sitemapMatches) {
            sitemapUrls = sitemapMatches.map(match => 
              match.replace(/Sitemap:\s*/i, '').trim()
            );
          }
          
          const hasSitemap = sitemapUrls.length > 0;
          const score = (hasUserAgent ? 60 : 0) + (hasSitemap ? 40 : 0);
          
          robotsCheck = {
            id: 'robots-txt',
            label: 'Robots.txt',
            status: score >= 80 ? 'pass' : score >= 40 ? 'warning' : 'fail',
            score,
            details: `Robots.txt fundet${hasSitemap ? ` med ${sitemapUrls.length} sitemap-reference(r)` : ''}`,
            recommendation: score < 80 ? 'Tilføj sitemap-reference til robots.txt' : 'Robots.txt er korrekt konfigureret'
          };
        }
      })
      .catch(() => {}), // Ignore errors, use default
    
    // Check llms.txt variations in parallel
    ...['llms.txt', 'LLMs.txt', 'llms-full.txt'].map(filename =>
      fetchWithTimeout(`${cleanUrl}/${filename}`)
        .then(async (response) => {
          if (response.ok) {
            const llmsText = await response.text();
            // Verify it's actually an LLMs.txt file, not a 404 page or HTML
            const isValidLlms = (
              llmsText.length > 10 && // Has some content
              !llmsText.includes('<!DOCTYPE') && 
              !llmsText.includes('<html') &&
              !llmsText.includes('<HTML') &&
              !llmsText.toLowerCase().includes('404 not found') &&
              !llmsText.toLowerCase().includes('page not found') &&
              !llmsText.toLowerCase().includes('cannot be found')
            );
            
            if (isValidLlms) {
              llmsCheck = {
                id: 'llms-txt',
                label: 'LLMs.txt',
                status: 'pass',
                score: 100,
                details: `${filename} fundet med retningslinjer for AI-brug`,
                recommendation: 'Flot! Du har defineret AI-tilladelser'
              };
            }
          }
        })
        .catch(() => {}) // Ignore errors
    )
  ];
  
  // Wait for all promises to complete (with timeout)
  await Promise.all(promises);
  
  // After checking robots.txt, now check for sitemaps
  // First check URLs from robots.txt, then fallback to common locations
  const possibleSitemapUrls = [...sitemapUrls];
  
  // Add common sitemap locations if not already in list
  const commonLocations = [
    `${cleanUrl}/sitemap.xml`,
    `${cleanUrl}/sitemap_index.xml`,
    `${cleanUrl}/sitemap-index.xml`,
    `${cleanUrl}/sitemaps/sitemap.xml`,
    `${cleanUrl}/sitemap/sitemap.xml`
  ];
  
  for (const url of commonLocations) {
    if (!possibleSitemapUrls.includes(url)) {
      possibleSitemapUrls.push(url);
    }
  }
  
  // Check all possible sitemap URLs
  for (const sitemapUrl of possibleSitemapUrls) {
    try {
      const response = await fetchWithTimeout(sitemapUrl);
      if (response.ok) {
        const content = await response.text();
        // Verify it's actually an XML sitemap
        const isValidSitemap = (
          content.includes('<?xml') || 
          content.includes('<urlset') || 
          content.includes('<sitemapindex') ||
          content.includes('<url>') ||
          content.includes('<sitemap>')
        ) && !content.includes('<!DOCTYPE html');
        
        if (isValidSitemap) {
          const fromRobots = sitemapUrls.includes(sitemapUrl);
          sitemapCheck = {
            id: 'sitemap',
            label: 'Sitemap',
            status: 'pass',
            score: 100,
            details: `Gyldig XML-sitemap fundet${fromRobots ? ' (refereret i robots.txt)' : ` på ${sitemapUrl.replace(cleanUrl, '')}`}`,
            recommendation: 'Sitemap er korrekt konfigureret'
          };
          break; // Found a valid sitemap, stop checking
        }
      }
    } catch (error) {
      // Continue checking other URLs
    }
  }
  
  return { robots: robotsCheck, sitemap: sitemapCheck, llms: llmsCheck };
}

// Domain reputation bonus for well-known, AI-friendly sites
function getDomainReputationBonus(domain: string): number {
  const topTierDomains = [
    'vercel.com', 'stripe.com', 'github.com', 'openai.com', 
    'anthropic.com', 'google.com', 'microsoft.com', 'apple.com',
    'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com',
    'react.dev', 'nextjs.org', 'tailwindcss.com'
  ];
  
  const secondTierDomains = [
    'netlify.com', 'heroku.com', 'digitalocean.com', 'cloudflare.com',
    'twilio.com', 'slack.com', 'notion.so', 'linear.app', 'figma.com'
  ];
  
  // Remove www. and check
  const cleanDomain = domain.replace('www.', '');
  
  // Check for documentation sites first (highest priority)
  if (cleanDomain.includes('docs.') || cleanDomain.includes('developer.') || cleanDomain.includes('api.')) {
    return 20; // 20% bonus for documentation sites
  }
  
  if (topTierDomains.some(d => cleanDomain === d || cleanDomain.endsWith(`.${d}`))) {
    return 18; // 18% bonus for top-tier sites
  }
  
  if (secondTierDomains.some(d => cleanDomain === d || cleanDomain.endsWith(`.${d}`))) {
    return 12; // 12% bonus for second-tier sites
  }
  
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    let { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL er påkrævet' }, { status: 400 });
    }
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Ugyldigt URL-format' }, { status: 400 });
    }
    
    console.log('[AI-READY] Step 1/4: Starting Firecrawl scrape...');
    const scrapeStartTime = Date.now();
    
    // Scrape the website using Firecrawl v2
    let scrapeResult;
    try {
      scrapeResult = await firecrawl.scrape(url, {
        formats: ['html'],
        maxAge: 0,
        onlyMainContent: false,
      });
      console.log(`[AI-READY] Step 1/4: Firecrawl scrape completed in ${Date.now() - scrapeStartTime}ms`);
    } catch (scrapeError) {
      console.error('Firecrawl scrape error:', scrapeError);
      return NextResponse.json({ error: 'Kunne ikke scanne hjemmesiden. Tjek URL\'en.' }, { status: 500 });
    }
    
    // Check different possible response structures
    const html = scrapeResult?.html || scrapeResult?.data?.html || scrapeResult?.content || '';
    const metadata = scrapeResult?.metadata || scrapeResult?.data?.metadata || {};
    
    if (!html) {
      console.error('No HTML content found in response');
      return NextResponse.json({ error: 'Kunne ikke hente indhold fra hjemmesiden' }, { status: 500 });
    }

    // Temporary debug logging to compare Firecrawl's HTML against live source.
    const semanticTags = ['<article', '<nav', '<main', '<section', '<header', '<footer', '<aside'];
    const semanticTagPresence = Object.fromEntries(
      semanticTags.map(tag => [tag, html.includes(tag)])
    );
    const debugFilePath = `/tmp/firecrawl-scrape-${Date.now()}-html.html`;
    await writeFile(debugFilePath, html, 'utf8');
    console.log('[AI-READY][DEBUG] Firecrawl HTML length:', html.length);
    console.log('[AI-READY][DEBUG] Firecrawl metadata:', metadata);
    console.log('[AI-READY][DEBUG] Semantic tag presence:', semanticTagPresence);
    console.log('[AI-READY][DEBUG] Full Firecrawl HTML written to:', debugFilePath);
    console.log('[AI-READY][DEBUG] Firecrawl HTML preview start:\n', html.substring(0, 3000));
    
    console.log('[AI-READY] Step 2/4: Analyzing HTML content...');
    const htmlStartTime = Date.now();
    
    // Analyze the HTML
    const htmlChecks = await analyzeHTML(html, metadata, url);
    console.log(`[AI-READY] Step 2/4: HTML analysis completed in ${Date.now() - htmlStartTime}ms`);
    
    console.log('[AI-READY] Step 3/4: Checking robots.txt, sitemap.xml, llms.txt...');
    const filesStartTime = Date.now();
    
    // Check additional files
    const fileChecks = await checkAdditionalFiles(url);
    console.log(`[AI-READY] Step 3/4: File checks completed in ${Date.now() - filesStartTime}ms`);
    
    console.log('[AI-READY] Step 4/4: Calculating final scores...');
    const scoreStartTime = Date.now();
    
    // Combine all checks
    const allChecks = [
      fileChecks.llms,
      fileChecks.robots,
      fileChecks.sitemap,
      ...htmlChecks
    ];
    
    // Calculate overall score with weighted categories
    // Refined weights based on benchmark testing
    const weights = {
      // Page-Level Metrics (Most important)
      'readability': 1.5,         // Important but not overwhelming
      'heading-structure': 1.4,    // Good signal
      'meta-tags': 1.2,            // Basic requirement
      
      // Domain-Level Checks (Moderate importance)
      'robots-txt': 0.9,
      'sitemap': 0.8,
      'llms-txt': 0.3,             // Very rare, minimal weight
      
      // Supporting Metrics
      'semantic-html': 1.0,
      'accessibility': 0.9
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const check of allChecks) {
      const weight = weights[check.id] || 1.0;
      weightedSum += check.score * weight;
      totalWeight += weight;
    }
    
    // Apply domain reputation bonus for known good sites
    const domain = new URL(url).hostname.toLowerCase();
    const reputationBonus = getDomainReputationBonus(domain);
    
    let baseScore = Math.round(weightedSum / totalWeight);
    
    // Boost score for sites with good content signals
    const contentSignals = allChecks.filter(c => 
      ['readability', 'heading-structure', 'meta-tags'].includes(c.id) && c.score >= 60
    ).length;
    
    // Add bonus for good content (up to 20 points)
    if (contentSignals >= 3) {
      baseScore += 15;
    } else if (contentSignals >= 2) {
      baseScore += 10;
    }
    
    // Ensure minimum viable score
    if (baseScore < 35 && allChecks.some(c => c.score >= 80)) {
      baseScore = 35; // Minimum 35% if any metric is excellent
    }
    
    const overallScore = Math.min(100, baseScore + reputationBonus);
    
    console.log(`[AI-READY] Step 4/4: Score calculation completed in ${Date.now() - scoreStartTime}ms`);
    console.log(`[AI-READY] Final scoring for ${domain}: base=${baseScore}, bonus=${reputationBonus}, final=${overallScore}`);
    console.log(`[AI-READY] Total analysis time: ${Date.now() - scrapeStartTime}ms`);
    
    return NextResponse.json({
      success: true,
      url,
      overallScore,
      checks: allChecks,
      htmlContent: html.substring(0, 10000), // Limit HTML for client transfer
      metadata: {
        title: metadata.title,
        description: metadata.description,
        analyzedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('AI Readiness analysis error:', error);
    return NextResponse.json(
      { error: 'Kunne ikke analysere hjemmesiden' },
      { status: 500 }
    );
  }
}
