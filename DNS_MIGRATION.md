# Moving kararibeauty.com DNS to Cloudflare

Prerequisite for the R2 image CDN (see `R2_IMAGE_CDN.md`). R2 custom domains
only work on zones Cloudflare hosts, and Cloudflare's subdomain-zone feature —
which would have let us delegate only `cdn.` — is Enterprise-only. So the whole
zone has to move.

## The one idea that makes this safe

Cloudflare will be used as **authoritative DNS only**. Every existing record
stays DNS-only (grey cloud), which means Cloudflare answers the lookup and then
gets out of the way — no proxying, no TLS termination, no caching, nothing in
the request path. Traffic continues to hit Vercel and Hostinger exactly as it
does today.

The only proxied hostname will be `cdn.kararibeauty.com`, which R2 creates and
manages itself.

If every record is copied correctly and left grey, this migration is invisible
to visitors and to email.

## Current records

Derived from public DNS on 2026-08-14. **This list cannot be proven complete** —
records that do not resolve publicly will not appear here. Before you start,
open the Hostinger DNS panel and export or screenshot the full zone, and treat
that as the source of truth.

### Apex — kararibeauty.com

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| A | `@` | `216.198.79.1` | **DNS only** |
| MX | `@` | `mx1.hostinger.com` (priority 5) | n/a |
| MX | `@` | `mx2.hostinger.com` (priority 10) | n/a |
| TXT | `@` | `v=spf1 include:_spf.mail.hostinger.com ~all` | n/a |
| TXT | `_dmarc` | `v=DMARC1; p=none` | n/a |

### Subdomains

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| CNAME | `www` | `8b60cf14604f31f8.vercel-dns-017.com` | **DNS only** |
| CNAME | `autodiscover` | `autodiscover.mail.hostinger.com` | **DNS only** |
| CNAME | `autoconfig` | `autoconfig.mail.hostinger.com` | **DNS only** |
| CNAME | `hostingermail-a._domainkey` | `hostingermail-a.dkim.mail.hostinger.com` | **DNS only** |
| CNAME | `hostingermail-b._domainkey` | `hostingermail-b.dkim.mail.hostinger.com` | **DNS only** |
| CNAME | `hostingermail-c._domainkey` | `hostingermail-c.dkim.mail.hostinger.com` | **DNS only** |

### Confirmed against Cloudflare's scan

The zone contains exactly 11 records and Cloudflare's import found all of them,
including the `_dmarc` TXT that public DNS would not return. Nothing had to be
added by hand.

Cloudflare imported seven of them as **Proxied**, and all seven had to be
flipped to DNS only — the apex `A`, `www`, `autoconfig`, `autodiscover`, and the
three `_domainkey` CNAMEs. Proxying a DKIM CNAME is the worst of these:
Cloudflare answers the lookup with its own addresses instead of the DKIM key, so
signature verification fails on every outgoing message.

The apex `A` and the `www` CNAME both point at Vercel. The four mail-related
CNAMEs plus the MX and SPF records are what keep email working.

## Order of operations

Do not skip step 5. Switching nameservers before the records are verified is the
one mistake in this process that takes the site and the email down together.

1. **Export the Hostinger zone.** Screenshot or download the full record list.
   This is your rollback reference and your completeness check.
2. **Lower TTLs at Hostinger** to 300s and wait for the old TTL to expire. The
   zone default is already 600s, so an hour is comfortable. This shortens the
   window if anything needs undoing.
3. **Add the site at Cloudflare.** Enter `kararibeauty.com` — the root domain,
   not `www.` and not `cdn.`. Choose the Free plan.
4. **Let the scan import records, then fix it by hand.** Cloudflare's import is
   a best-effort scan and routinely misses records. Compare what it found
   against your Hostinger export line by line and add anything missing.
5. **Set every record to DNS only.** Click each orange cloud until it is grey.
   This is the step that makes the migration invisible.

   Proxying the Vercel records in particular will break TLS certificate renewal
   and can produce redirect loops, because Vercel and Cloudflare would both be
   terminating TLS and both issuing redirects.
6. **Verify inside Cloudflare before touching nameservers.** Record counts
   match, values match character for character, all clouds grey.
7. **Change nameservers at the registrar.** Cloudflare gives you two. Replace
   `athena.dns-parking.com` and `apollo.dns-parking.com` at Hostinger's domain
   panel. Propagation is typically under an hour but can take up to 24.
8. **Confirm before doing anything else.** See the checks below.

## Verification after the switch

```bash
nslookup -type=NS kararibeauty.com 8.8.8.8      # expect the two Cloudflare nameservers
nslookup www.kararibeauty.com 8.8.8.8           # expect the vercel-dns CNAME, unchanged
nslookup -type=MX kararibeauty.com 8.8.8.8      # expect mx1 and mx2 at hostinger
nslookup -type=TXT kararibeauty.com 8.8.8.8     # expect the SPF record, unchanged
```

Then, and this is the one people forget: **send a test email to a real inbox at
this domain, and send one from it to an external address.** DNS resolving
correctly does not prove mail flow. Do this before you consider the migration
done.

Load `https://www.kararibeauty.com` and confirm the padlock and a normal page.

## Rollback

Point the nameservers back to `athena.dns-parking.com` and
`apollo.dns-parking.com` at Hostinger. The original zone is still there, which
is why step 1 matters. With TTLs at 300s, recovery is minutes, not hours.

## Only after all of the above

Return to `R2_IMAGE_CDN.md`:

1. Create bucket `karari-media`.
2. Connect custom domain `cdn.kararibeauty.com` — it will be found now that
   Cloudflare hosts the zone. R2 creates and proxies this record itself; leave
   it alone.
3. Mint the scoped API token, fill `.env.local`, run `npm run images:r2:write`.
4. Set `NEXT_PUBLIC_CDN_BASE` in Vercel last.
