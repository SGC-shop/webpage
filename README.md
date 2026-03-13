## SHREE GANESH COLLECTION — Static Website

This is a **simple static website** for a retail apparels & clothing store.  
There is **no server**, **no login**, and **no admin panel**.

The website is designed so a non-technical person can update:

- **product listing**: `data/products.json`
- **offers and sales**: `data/offers.json`
- **contact / links / about text**: `data/config.json`

### Quick start (view locally)

Because the site loads JSON files, it should be opened via a small local server (not by double-clicking `index.html`).

From the folder `shree-ganesh-collection-site/` run:

```bash
python -m http.server 8000
```

Then open:

- `http://localhost:8000`

### Deploy (no server required)

You can host this on any static host:

- GitHub Pages
- Netlify
- Cloudflare Pages
- Any web hosting where you can upload files

Upload the entire `shree-ganesh-collection-site/` folder contents.

### Update products

Edit `data/products.json`.

Each product looks like:

```json
{
  "id": "unique-id",
  "name": "Product name",
  "category": "Casual wear",
  "audience": ["men", "women", "kids", "unisex"],
  "highlights": ["Point 1", "Point 2", "Point 3"],
  "priceNote": "Ask for current price",
  "tags": ["tag1", "tag2"],
  "image": null
}
```

- **image**: if you want an image, put it in `assets/products/` and set `"image"` to a relative path, e.g.
  - `"image": "./assets/products/casual-tshirt.jpg"`

### Update offers

Edit `data/offers.json`.

### Update phone / WhatsApp / address

Edit `data/config.json`:

- `store.phone`
- `store.whatsapp`
- `store.address`
- `store.mapsUrl`

The WhatsApp buttons will automatically use the number you set.
