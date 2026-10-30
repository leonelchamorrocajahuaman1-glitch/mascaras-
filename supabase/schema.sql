-- SPIDER MASKS · Esquema para Supabase (PostgreSQL)
-- Ejecuta este archivo completo en Supabase → SQL Editor.
-- El frontend NUNCA accede directamente a estas tablas: todas las operaciones
-- pasan por las rutas del servidor de Next.js usando la service role key.

create extension if not exists pgcrypto;

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

create sequence if not exists order_number_seq start 1001;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique default nextval('order_number_seq'),
  status text not null default 'pending'
    check (status in ('pending','processing','shipped','delivered','cancelled')),
  payment_status text not null default 'demo_unpaid'
    check (payment_status in ('demo_unpaid','paid','refunded')),
  customer jsonb not null,
  subtotal_cents integer not null,
  shipping_cents integer not null,
  total_cents integer not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- Migración para proyectos creados con una versión anterior del esquema.
alter table products add column if not exists model_url text;

-- RLS activado sin políticas públicas: solo la service role (servidor) puede leer/escribir.
alter table products enable row level security;
alter table product_variants enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Crea un pedido de forma atómica: bloquea variantes, valida stock, calcula precios y descuenta existencias.
create or replace function place_order(p_customer jsonb, p_items jsonb, p_shipping_rule jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_variant record;
  v_subtotal integer := 0;
  v_shipping integer := 0;
  v_unit integer;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER';
  end if;

  insert into orders (customer, subtotal_cents, shipping_cents, total_cents, currency)
  values (p_customer, 0, 0, 0, coalesce(p_shipping_rule->>'currency', 'USD'))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select v.id, v.name, v.sku, v.stock, v.price_cents, p.id as product_id, p.name as product_name,
           p.price_cents as product_price, p.images[1] as image, p.active
      into v_variant
      from product_variants v join products p on p.id = v.product_id
     where v.id = (v_item->>'variantId')::uuid and p.id = (v_item->>'productId')::uuid
     for update of v;

    if not found or not v_variant.active then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;
    if v_variant.stock < (v_item->>'quantity')::integer then
      raise exception 'OUT_OF_STOCK:%', v_variant.product_name || ' (' || v_variant.name || ')';
    end if;

    v_unit := coalesce(v_variant.price_cents, v_variant.product_price);
    update product_variants set stock = stock - (v_item->>'quantity')::integer where id = v_variant.id;
    insert into order_items (order_id, product_id, variant_id, product_name, variant_name, sku, image, unit_price_cents, quantity)
    values (v_order_id, v_variant.product_id, v_variant.id, v_variant.product_name, v_variant.name, v_variant.sku,
            v_variant.image, v_unit, (v_item->>'quantity')::integer);
    v_subtotal := v_subtotal + v_unit * (v_item->>'quantity')::integer;
  end loop;

  if v_subtotal < (p_shipping_rule->>'freeFrom')::integer then
    v_shipping := (p_shipping_rule->>'flat')::integer;
  end if;

  update orders set subtotal_cents = v_subtotal, shipping_cents = v_shipping, total_cents = v_subtotal + v_shipping
   where id = v_order_id;
  return v_order_id;
end;
$$;

-- Cambia el estado del pedido; al cancelar repone stock y al reactivar lo vuelve a descontar.
create or replace function set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_item record;
begin
  select status into v_old from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_old = p_status then return; end if;

  if p_status = 'cancelled' or v_old = 'cancelled' then
    for v_item in select variant_id, quantity from order_items where order_id = p_order_id loop
      if p_status = 'cancelled' then
        update product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
      else
        update product_variants set stock = stock - v_item.quantity where id = v_item.variant_id and stock >= v_item.quantity;
        if not found then raise exception 'OUT_OF_STOCK'; end if;
      end if;
    end loop;
  end if;

  update orders set status = p_status, updated_at = now() where id = p_order_id;
end;
$$;

revoke all on function place_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function set_order_status(uuid, text) from public, anon, authenticated;

-- Bucket público de imágenes de producto (lectura pública, escritura solo desde el servidor).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
