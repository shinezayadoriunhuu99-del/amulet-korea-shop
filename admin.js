const cfg = window.AMULET_CONFIG;

const db = supabase.createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_ANON_KEY
);

const $ = (selector) =>
  document.querySelector(selector);

function money(value) {
  return Math.round(Number(value) || 0)
    .toLocaleString() + "₮";
}

/* =========================
   ADMIN LOGIN
========================= */

window.adminLogin = async function () {

  const email =
    $("#email").value.trim();

  const password =
    $("#password").value;

  $("#login-message").textContent =
    "Нэвтэрч байна...";

  const { error } =
    await db.auth.signInWithPassword({
      email,
      password
    });

  if (error) {

    $("#login-message").textContent =
      "Email эсвэл нууц үг буруу байна.";

    return;
  }

  $("#login-section").style.display =
    "none";

  $("#admin-panel").style.display =
    "block";

  await loadCategories();
  await loadProducts();
};


/* =========================
   LOGOUT
========================= */

window.adminLogout = async function () {

  await db.auth.signOut();

  $("#admin-panel").style.display =
    "none";

  $("#login-section").style.display =
    "block";
};


/* =========================
   CATEGORY
========================= */

async function loadCategories() {

  const { data, error } =
    await db
      .from("categories")
      .select("*")
      .order("sort_order");

  if (error) {
    console.error(error);
    return;
  }

  const select =
    $("#product-category");

  select.innerHTML =
    `<option value="">
       Ангилал сонгох
     </option>`;

  (data || []).forEach(category => {

    const option =
      document.createElement("option");

    option.value =
      category.id;

    option.textContent =
      category.name;

    select.appendChild(option);
  });
}


/* =========================
   PRODUCT ADD
========================= */

window.addProduct = async function () {

  const name =
    $("#product-name").value.trim();

  const categoryId =
    $("#product-category").value;

  const priceWon =
    Number($("#price-won").value);

  const exchangeRate =
    Number($("#exchange-rate").value);

  const stock =
    Number($("#stock").value);

  const description =
    $("#description").value.trim();

  const imageFile =
    $("#product-image").files[0];

  const message =
    $("#product-message");

  if (!name) {
    message.textContent =
      "Барааны нэрээ оруулна уу.";
    return;
  }

  if (!categoryId) {
    message.textContent =
      "Ангиллаа сонгоно уу.";
    return;
  }

  if (!priceWon) {
    message.textContent =
      "Воны үнээ оруулна уу.";
    return;
  }

  if (!imageFile) {
    message.textContent =
      "Барааны зураг сонгоно уу.";
    return;
  }

  message.textContent =
    "Бараа оруулж байна...";


  /* ЗУРАГ UPLOAD */

  const safeName =
    imageFile.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

  const filePath =
    Date.now() + "-" + safeName;

  const { error: uploadError } =
    await db.storage
      .from("product-images")
      .upload(
        filePath,
        imageFile
      );

  if (uploadError) {

    console.error(uploadError);

    message.textContent =
      "Зураг upload хийхэд алдаа гарлаа.";

    return;
  }


  /* PUBLIC IMAGE URL */

  const { data: imageData } =
    db.storage
      .from("product-images")
      .getPublicUrl(filePath);

  const imageUrl =
    imageData.publicUrl;


  /* DATABASE PRODUCT */

  const { error } =
    await db
      .from("products")
      .insert({

        name: name,

        description:
          description,

        category_id:
          Number(categoryId),

        price_krw:
          priceWon,

        exchange_rate:
          exchangeRate || 2.5,

        stock:
          stock || 0,

        image_url:
          imageUrl,

        is_active:
          true
      });


  if (error) {

    console.error(error);

    message.textContent =
      "Бараа нэмэхэд алдаа гарлаа.";

    return;
  }


  message.textContent =
    "✅ Бараа амжилттай нэмэгдлээ!";


  $("#product-name").value = "";
  $("#price-won").value = "";
  $("#stock").value = "1";
  $("#description").value = "";
  $("#product-image").value = "";

  await loadProducts();
};


/* =========================
   PRODUCT LIST
========================= */

async function loadProducts() {

  const { data, error } =
    await db
      .from("products")
      .select("*")
      .order(
        "created_at",
        { ascending: false }
      );

  if (error) {

    console.error(error);

    $("#admin-products").innerHTML =
      "Бараа ачаалахад алдаа гарлаа.";

    return;
  }

  if (!data || data.length === 0) {

    $("#admin-products").innerHTML =
      "<p>Одоогоор бараа байхгүй.</p>";

    return;
  }

  $("#admin-products").innerHTML =
    data.map(product => `

      <div class="product-card">

        <img
          src="${product.image_url || ""}"
          alt="${product.name}"
        >

        <div class="product-info">

          <h3>
            ${product.name}
          </h3>

          <div class="price-won">
            ₩${Number(
              product.price_krw
            ).toLocaleString()}
          </div>

          <div class="price-mnt">
            ${money(
              product.price_mnt
            )}
          </div>

          <p>
            Үлдэгдэл:
            ${product.stock || 0}
          </p>

          <button
            onclick="deleteProduct(${product.id})">
            Устгах
          </button>

        </div>

      </div>

    `).join("");
}


/* =========================
   DELETE PRODUCT
========================= */

window.deleteProduct =
async function (id) {

  const ok =
    confirm(
      "Энэ барааг устгах уу?"
    );

  if (!ok) return;

  const { error } =
    await db
      .from("products")
      .delete()
      .eq("id", id);

  if (error) {

    alert(
      "Устгахад алдаа гарлаа."
    );

    console.error(error);

    return;
  }

  await loadProducts();
};


/* =========================
   CHECK LOGIN
========================= */

async function checkAdmin() {

  const {
    data: { user }
  } = await db.auth.getUser();

  if (user) {

    $("#login-section").style.display =
      "none";

    $("#admin-panel").style.display =
      "block";

    await loadCategories();
    await loadProducts();

  } else {

    $("#login-section").style.display =
      "block";

    $("#admin-panel").style.display =
      "none";
  }
}

checkAdmin();
