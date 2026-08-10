const cfg = window.AMULET_CONFIG;

const db = supabase.createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_ANON_KEY
);

let products = [];
let categories = [];
let activeCategory = null;

let cart = JSON.parse(
  localStorage.getItem("amulet-cart") || "[]"
);

const $ = (selector) => document.querySelector(selector);

function money(value) {
  return Math.round(Number(value) || 0).toLocaleString() + "₮";
}

function saveCart() {
  localStorage.setItem("amulet-cart", JSON.stringify(cart));

  const count = cart.reduce((sum, item) => {
    return sum + item.qty;
  }, 0);

  $("#cartCount").textContent = count;
}

/* =========================
   БАРАА + АНГИЛАЛ АЧААЛАХ
========================= */

async function loadShop() {

  const categoryResult = await db
    .from("categories")
    .select("*")
    .order("sort_order");

  const productResult = await db
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", {
      ascending: false
    });

  if (categoryResult.error) {
    console.error(categoryResult.error);
  }

  if (productResult.error) {
    console.error(productResult.error);
  }

  categories = categoryResult.data || [];
  products = productResult.data || [];

  renderCategories();
  renderProducts();
  saveCart();
}

/* =========================
   АНГИЛАЛ
========================= */

function renderCategories() {

  const box = $("#categories");

  box.innerHTML =
    `<button class="chip active" data-id="">
       Бүгд
     </button>` +

    categories.map(category => `
      <button
        class="chip"
        data-id="${category.id}">
        ${category.name}
      </button>
    `).join("");

  document.querySelectorAll(".chip").forEach(button => {

    button.addEventListener("click", () => {

      activeCategory =
        button.dataset.id || null;

      document
        .querySelectorAll(".chip")
        .forEach(x =>
          x.classList.remove("active")
        );

      button.classList.add("active");

      renderProducts();
    });

  });
}

/* =========================
   БАРАА
========================= */

function renderProducts() {

  const searchText =
    $("#search").value
      .trim()
      .toLowerCase();

  const filtered = products.filter(product => {

    const categoryOK =
      !activeCategory ||
      String(product.category_id) ===
      String(activeCategory);

    const searchOK =
      product.name
        .toLowerCase()
        .includes(searchText);

    return categoryOK && searchOK;
  });

  if (!filtered.length) {

    $("#products").innerHTML =
      `<p>Бараа олдсонгүй.</p>`;

    return;
  }

  $("#products").innerHTML =
    filtered.map(product => `

      <article class="product-card">

        <img
          src="${product.image_url || ""}"
          alt="${product.name}"
        >

        <div class="product-info">

          <h3>${product.name}</h3>

          <div class="price-won">
            ₩${Number(
              product.price_krw
            ).toLocaleString()}
          </div>

          <div class="price-mnt">
            ${money(product.price_mnt)}
          </div>

          <button
            onclick="addCart(${product.id})">
            Сагсанд хийх
          </button>

        </div>

      </article>

    `).join("");
}

/* =========================
   САГС
========================= */

window.addCart = function (id) {

  const product =
    products.find(x => x.id === id);

  if (!product) return;

  const existing =
    cart.find(x => x.id === id);

  if (existing) {

    existing.qty += 1;

  } else {

    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price_mnt),
      qty: 1
    });

  }

  saveCart();
  openCart();
};

window.removeCart = function (index) {

  cart.splice(index, 1);

  saveCart();
  renderCart();
};

function openCart() {

  renderCart();

  $("#drawer")
    .classList
    .remove("hidden");
}

function renderCart() {

  if (!cart.length) {

    $("#cartItems").innerHTML =
      `<p>Сагс хоосон байна.</p>`;

  } else {

    $("#cartItems").innerHTML =
      cart.map((item, index) => `

        <div class="cartRow">

          <div>

            <b>${item.name}</b>

            <br>

            ${money(item.price)}
            ×
            ${item.qty}

          </div>

          <button
            onclick="removeCart(${index})">
            Устгах
          </button>

        </div>

      `).join("");
  }

  const total =
    cart.reduce((sum, item) => {
      return sum +
        item.price * item.qty;
    }, 0);

  $("#cartTotal").textContent =
    money(total);
}

/* =========================
   ЗАХИАЛГА
========================= */

$("#orderForm").addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!cart.length) {

      $("#orderMsg").textContent =
        "Сагс хоосон байна.";

      return;
    }

    $("#orderMsg").textContent =
      "Захиалга илгээж байна...";

    const items = cart.map(item => ({
      product_id: item.id,
      quantity: item.qty
    }));

    const { data, error } =
      await db.rpc(
        "create_shop_order",
        {
          p_customer_name:
            $("#customerName").value.trim(),

          p_phone:
            $("#phone").value.trim(),

          p_address:
            $("#address").value.trim(),

          p_items: items
        }
      );

    if (error) {

      console.error(error);

      $("#orderMsg").textContent =
        "Захиалга илгээхэд алдаа гарлаа.";

      return;
    }

    cart = [];

    saveCart();
    renderCart();

    $("#orderForm").reset();

    $("#orderMsg").textContent =
      "✅ Захиалга амжилттай илгээгдлээ. №" +
      data;
  }
);

/* =========================
   BUTTONS
========================= */

$("#search").addEventListener(
  "input",
  renderProducts
);

$("#cartBtn").addEventListener(
  "click",
  openCart
);

$("#navCart").addEventListener(
  "click",
  openCart
);

$("#closeDrawer").addEventListener(
  "click",
  () => {
    $("#drawer")
      .classList
      .add("hidden");
  }
);

$("#navCategories").addEventListener(
  "click",
  () => {

    $("#categories")
      .scrollIntoView({
        behavior: "smooth"
      });

  }
);

/* START */

loadShop();
