-- SPIDER MASKS · Esquema y migración para Supabase (PostgreSQL)
-- Ejecuta este archivo completo en Supabase → SQL Editor. Es idempotente:
-- se puede volver a ejecutar sobre una base creada con versiones anteriores sin perder datos.
--
-- Modelo de seguridad:
--   * El navegador NUNCA habla con estas tablas. Tienda y panel pasan por el servidor de Next.js,
--     que usa la service role key (solo en el servidor) y comprueba sesión y permisos en cada operación.
--   * RLS está activado en todas las tablas SIN políticas para anon/authenticated: cualquier acceso
--     directo con la clave pública (anon) queda denegado.
--   * Las funciones con lógica de stock son SECURITY DEFINER y solo las puede ejecutar service_role.

create extension if not exists pgcrypto;

-- ───────────── Configuración ─────────────
create table if not exists store_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into store_settings (id) values (1) on conflict (id) do nothing;

-- ───────────── Categorías ─────────────
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────── Productos ─────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  tagline text not null default '',
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  compare_at_cents integer check (compare_at_cents >= 0),
  images text[] not null default '{}',
  model_key text not null,
  model_url text,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table products add column if not exists model_url text;

-- Categorías para los productos existentes y clave foránea (renombrar una categoría actualiza sus productos).
insert into categories (slug, name)
select distinct category, initcap(replace(category, '-', ' ')) from products
on conflict (slug) do nothing;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_category_fkey') then
    alter table products add constraint products_category_fkey foreign key (category) references categories(slug) on update cascade on delete restrict;
  end if;
end $$;

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  sku text not null,
  stock integer not null default 0 check (stock >= 0),
  price_cents integer check (price_cents >= 0),
  position integer not null default 0
);
create index if not exists product_variants_product_idx on product_variants(product_id);

-- ───────────── Clientes ─────────────
-- Se registran automáticamente al hacer un pedido (la tienda no tiene cuentas con contraseña).
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null default '',
  phone text not null default '',
  city text not null default '',
  country text not null default '',
  status text not null default 'active' check (status in ('active', 'suspended')),
  suspended_reason text,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────── Pedidos ─────────────
create sequence if not exists order_number_seq start 1001;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique default nextval('order_number_seq'),
  status text not null default 'pending',
  payment_status text not null default 'unpaid',
  customer jsonb not null,
  subtotal_cents integer not null,
  shipping_cents integer not null,
  total_cents integer not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table orders add column if not exists payment_method text not null default 'none';
alter table orders add column if not exists payment_ref text;
alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists customer_id uuid references customers(id) on delete set null;
alter table orders add column if not exists history jsonb not null default '[]'::jsonb;
alter table orders add column if not exists is_test boolean not null default false;

-- Estados ampliados (pendiente, confirmado, preparando, enviado, entregado, cancelado).
update orders set payment_status = 'unpaid' where payment_status = 'demo_unpaid';
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (status in ('pending','confirmed','processing','shipped','delivered','cancelled'));
alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add constraint orders_payment_status_check check (payment_status in ('unpaid','paid','refunded'));
alter table orders alter column payment_status set default 'unpaid';
alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check check (payment_method in ('none','bank_transfer','cash','card_terminal','other'));

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid,
  variant_id uuid,
  product_name text not null,
  variant_name text not null,
  sku text not null,
  image text,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0)
);
create index if not exists order_items_order_idx on order_items(order_id);

-- ───────────── Inventario ─────────────
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid,
  variant_id uuid,
  product_name text not null,
  variant_name text not null,
  sku text not null,
  delta integer not null,
  stock_after integer not null,
  reason text not null check (reason in ('sale','cancel','reactivate','restock','return','damage','adjustment','initial')),
  order_id uuid,
  note text not null default '',
  actor text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists stock_movements_variant_idx on stock_movements(variant_id, created_at desc);
create index if not exists stock_movements_created_idx on stock_movements(created_at desc);

-- ───────────── Modelos 3D ─────────────
create table if not exists model_assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  url text unique not null,
  source text not null check (source in ('public','upload','supabase')),
  name text not null,
  author text not null default '',
  source_url text not null default '',
  license text not null default '',
  rotation_x real not null default 0,
  rotation_y real not null default 0,
  size_bytes bigint not null default 0,
  valid boolean not null default false,
  issues jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────── Usuarios del panel ─────────────
-- El propietario se define en .env.local (ADMIN_EMAIL / ADMIN_PASSWORD_HASH). Aquí solo el personal que él crea.
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null default '',
  role text not null check (role in ('admin','staff')),
  password_hash text not null,
  active boolean not null default true,
  session_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- ───────────── RLS: denegar todo acceso directo ─────────────
alter table store_settings enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table stock_movements enable row level security;
alter table model_assets enable row level security;
alter table admin_users enable row level security;
revoke all on store_settings, categories, products, product_variants, customers, orders, order_items, stock_movements, model_assets, admin_users from anon, authenticated;

-- ───────────── Funciones atómicas ─────────────
drop function if exists place_order(jsonb, jsonb, jsonb);

-- Crea un pedido: valida tienda/cliente/stock, calcula precios y envío en el servidor y descuenta stock.
create or replace function place_order(p_customer jsonb, p_items jsonb, p_is_test boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_settings jsonb;
  v_order_id uuid;
  v_customer_id uuid;
  v_customer_status text;
  v_email text := lower(trim(p_customer->>'email'));
  v_item record;
  v_variant record;
  v_subtotal integer := 0;
  v_shipping integer := 0;
  v_max integer;
  v_actor text := case when p_is_test then 'prueba automática' else 'tienda' end;
begin
  select data into v_settings from store_settings where id = 1;
  if coalesce((v_settings->>'ordersEnabled')::boolean, true) = false then raise exception 'ORDERS_DISABLED'; end if;
  v_max := coalesce((v_settings->>'maxQuantityPerItem')::integer, 10);
  if jsonb_array_length(p_items) = 0 then raise exception 'PRODUCT_UNAVAILABLE'; end if;

  select id, status into v_customer_id, v_customer_status from customers where email = v_email for update;
  if v_customer_status = 'suspended' then raise exception 'CUSTOMER_SUSPENDED'; end if;
  if v_customer_id is null then
    insert into customers (email, name, phone, city, country)
    values (v_email, p_customer->>'name', coalesce(p_customer->>'phone',''), p_customer->>'city', p_customer->>'country')
    returning id into v_customer_id;
  else
    update customers set name = p_customer->>'name', phone = coalesce(nullif(p_customer->>'phone',''), phone),
      city = p_customer->>'city', country = p_customer->>'country', updated_at = now() where id = v_customer_id;
  end if;

  insert into orders (customer, customer_id, subtotal_cents, shipping_cents, total_cents, is_test, history)
  values (jsonb_set(p_customer, '{email}', to_jsonb(v_email)), v_customer_id, 0, 0, 0, p_is_test,
          jsonb_build_array(jsonb_build_object('type','status','status','pending','by',v_actor,'at',now())))
  returning id into v_order_id;

  -- Agrupa líneas de la misma variante.
  for v_item in
    select (e->>'productId')::uuid as product_id, (e->>'variantId')::uuid as variant_id, sum((e->>'quantity')::integer)::integer as qty
    from jsonb_array_elements(p_items) e group by 1, 2
  loop
    if v_item.qty > v_max then raise exception 'MAX_QUANTITY:%', v_max; end if;
    select v.id, v.name, v.sku, v.stock, v.price_cents, p.id as pid, p.name as pname, p.price_cents as pprice, p.images[1] as image, p.active
      into v_variant
      from product_variants v join products p on p.id = v.product_id
     where v.id = v_item.variant_id and p.id = v_item.product_id
     for update of v;
    if not found or not v_variant.active then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if v_variant.stock < v_item.qty then raise exception 'OUT_OF_STOCK:% (%)', v_variant.pname, v_variant.name; end if;

    update product_variants set stock = stock - v_item.qty where id = v_variant.id;
    insert into order_items (order_id, product_id, variant_id, product_name, variant_name, sku, image, unit_price_cents, quantity)
    values (v_order_id, v_variant.pid, v_variant.id, v_variant.pname, v_variant.name, v_variant.sku, v_variant.image,
            coalesce(v_variant.price_cents, v_variant.pprice), v_item.qty);
    insert into stock_movements (product_id, variant_id, product_name, variant_name, sku, delta, stock_after, reason, order_id, actor)
    values (v_variant.pid, v_variant.id, v_variant.pname, v_variant.name, v_variant.sku, -v_item.qty, v_variant.stock - v_item.qty, 'sale', v_order_id, v_actor);
    v_subtotal := v_subtotal + coalesce(v_variant.price_cents, v_variant.pprice) * v_item.qty;
  end loop;

  if v_subtotal < coalesce((v_settings->>'freeShippingFromCents')::integer, 25000) then
    v_shipping := coalesce((v_settings->>'shippingCents')::integer, 1200);
  end if;
  update orders set subtotal_cents = v_subtotal, shipping_cents = v_shipping, total_cents = v_subtotal + v_shipping where id = v_order_id;
  return v_order_id;
end $$;

drop function if exists set_order_status(uuid, text);

-- Cambia el estado. El stock solo se mueve al entrar o salir de "cancelled": nunca se descuenta dos veces.
create or replace function set_order_status(p_order_id uuid, p_status text, p_actor text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old text;
  v_item record;
  v_stock integer;
begin
  select status into v_old from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_old = p_status then return; end if;

  if p_status = 'cancelled' or v_old = 'cancelled' then
    for v_item in select * from order_items where order_id = p_order_id loop
      if p_status = 'cancelled' then
        update product_variants set stock = stock + v_item.quantity where id = v_item.variant_id returning stock into v_stock;
      else
        update product_variants set stock = stock - v_item.quantity where id = v_item.variant_id and stock >= v_item.quantity returning stock into v_stock;
        if not found then raise exception 'OUT_OF_STOCK:% (%)', v_item.product_name, v_item.variant_name; end if;
      end if;
      if v_stock is not null then
        insert into stock_movements (product_id, variant_id, product_name, variant_name, sku, delta, stock_after, reason, order_id, actor)
        values (v_item.product_id, v_item.variant_id, v_item.product_name, v_item.variant_name, v_item.sku,
                case when p_status = 'cancelled' then v_item.quantity else -v_item.quantity end, v_stock,
                case when p_status = 'cancelled' then 'cancel' else 'reactivate' end, p_order_id, p_actor);
      end if;
    end loop;
  end if;

  update orders set status = p_status, updated_at = now(),
    history = history || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('type','status','status',p_status,'by',p_actor,'at',now(),'note',p_note)))
  where id = p_order_id;
end $$;

-- Entrada, salida o recuento de stock con registro del movimiento.
create or replace function adjust_stock(p_variant_id uuid, p_mode text, p_quantity integer, p_reason text, p_note text, p_actor text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v record;
  v_delta integer;
  v_id uuid;
begin
  select pv.id, pv.name, pv.sku, pv.stock, p.id as pid, p.name as pname
    into v from product_variants pv join products p on p.id = pv.product_id where pv.id = p_variant_id for update of pv;
  if not found then raise exception 'VARIANT_NOT_FOUND'; end if;
  v_delta := case p_mode when 'in' then p_quantity when 'out' then -p_quantity else p_quantity - v.stock end;
  if v_delta = 0 then raise exception 'NO_CHANGE'; end if;
  if v.stock + v_delta < 0 then raise exception 'OUT_OF_STOCK:solo hay %', v.stock; end if;
  update product_variants set stock = stock + v_delta where id = v.id;
  update products set updated_at = now() where id = v.pid;
  insert into stock_movements (product_id, variant_id, product_name, variant_name, sku, delta, stock_after, reason, note, actor)
  values (v.pid, v.id, v.pname, v.name, v.sku, v_delta, v.stock + v_delta, p_reason, coalesce(p_note, ''), p_actor)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function place_order(jsonb, jsonb, boolean) from public, anon, authenticated;
revoke all on function set_order_status(uuid, text, text, text) from public, anon, authenticated;
revoke all on function adjust_stock(uuid, text, integer, text, text, text) from public, anon, authenticated;
grant execute on function place_order(jsonb, jsonb, boolean) to service_role;
grant execute on function set_order_status(uuid, text, text, text) to service_role;
grant execute on function adjust_stock(uuid, text, integer, text, text, text) to service_role;

-- ───────────── Almacenamiento ─────────────
-- Lectura pública (la tienda muestra las imágenes y modelos); escritura solo desde el servidor (service role).
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('models', 'models', true) on conflict (id) do nothing;
