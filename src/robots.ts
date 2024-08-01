export const robots = `
# Global
User-agent: *
Disallow: /console/

# Chinese Forbidden
User-agent: Baiduspider
User-agent: Sogou spider
User-agent: YodaoBot
User-agent: 360Spider
User-agent: Bytespider
User-agent: Sosospider
User-agent: Wechat
Disallow: /

# Common Language User-agent Forbidden
User-agent: Python-urllib
User-agent: python-requests
User-agent: Go-http-client
User-agent: Go-resty
User-agent: Ruby
User-agent: Java
User-agent: Apache-HttpClient
User-agent: PHP
User-agent: Node-Fetch
User-agent: axios
Disallow: /

# Common Crawlers Forbidden
User-agent: Scrapy
User-agent: Pyspider
User-agent: Colly
Disallow: /

# Main Search Engines Allow
User-agent: Googlebot
User-agent: bingbot
User-agent: Slurp
Allow: /

Crawl-delay: 10
`
