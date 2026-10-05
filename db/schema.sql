CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS farms (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'بيت عبد الرحمن',
  owner_name TEXT NOT NULL DEFAULT 'عبد الرحمن',
  currency CHAR(3) NOT NULL DEFAULT 'EGP',
  password_hash TEXT,
  weight_unit TEXT NOT NULL DEFAULT 'كجم',
  notify_stock BOOLEAN NOT NULL DEFAULT TRUE,
  notify_debt BOOLEAN NOT NULL DEFAULT TRUE,
  notify_daily BOOLEAN NOT NULL DEFAULT TRUE,
  notify_prices BOOLEAN NOT NULL DEFAULT TRUE,
  assumed_daily_gain_grams NUMERIC(8,2) NOT NULL DEFAULT 45,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO farms (id, name, owner_name) VALUES (1, 'بيت عبد الرحمن', 'عبد الرحمن') ON CONFLICT (id) DO NOTHING;

UPDATE farms
SET owner_name = 'عبد الرحمن',
    password_hash = NULL,
    name = CASE WHEN name IN ('مزرعة الدواجن', '') THEN 'بيت عبد الرحمن' ELSE name END
WHERE id = 1;

CREATE TABLE IF NOT EXISTS cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  poultry_type TEXT NOT NULL DEFAULT 'تسمين',
  breed TEXT,
  start_date DATE NOT NULL,
  expected_sell_date DATE,
  initial_quantity INTEGER NOT NULL CHECK (initial_quantity > 0),
  chick_supplier TEXT,
  chick_unit_price NUMERIC(14,2),
  location TEXT,
  target_weight_kg NUMERIC(10,3),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  closed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

INSERT INTO expense_categories (id, name_ar, sort_order) VALUES
  ('chicks', 'كتاكيت', 1),
  ('feed', 'علف', 2),
  ('clover', 'برسيم', 3),
  ('corn', 'ذرة', 4),
  ('soy', 'صويا', 5),
  ('medicine', 'أدوية', 6),
  ('vaccine', 'تطعيمات', 7),
  ('vitamins', 'فيتامينات', 8),
  ('labor', 'عمالة', 9),
  ('electricity', 'كهرباء', 10),
  ('water', 'مياه', 11),
  ('transport', 'نقل', 12),
  ('rent', 'إيجار', 13),
  ('maintenance', 'صيانة', 14),
  ('tools', 'أدوات', 15),
  ('other', 'أخرى', 16)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  products TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES cycles(id) ON DELETE SET NULL,
  category_id TEXT NOT NULL REFERENCES expense_categories(id),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  quantity NUMERIC(14,3) CHECK (quantity IS NULL OR quantity >= 0),
  unit TEXT,
  unit_price NUMERIC(14,2) CHECK (unit_price IS NULL OR unit_price >= 0),
  expense_date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'credit', 'partial')),
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (paid_amount <= amount)
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sale_date DATE NOT NULL,
  bird_count INTEGER NOT NULL CHECK (bird_count > 0),
  weight_kg NUMERIC(14,3) NOT NULL CHECK (weight_kg > 0),
  price_per_kg NUMERIC(14,2) NOT NULL CHECK (price_per_kg >= 0),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (paid_amount <= total_amount)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'كجم',
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  avg_unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (avg_unit_cost >= 0),
  last_unit_cost NUMERIC(14,2),
  min_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES cycles(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'consume', 'adjust')),
  quantity NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,2),
  movement_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  mortality INTEGER NOT NULL DEFAULT 0 CHECK (mortality >= 0),
  mortality_reason TEXT,
  feed_consumed NUMERIC(14,3) CHECK (feed_consumed IS NULL OR feed_consumed >= 0),
  feed_unit TEXT,
  feed_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  water_liters NUMERIC(14,3) CHECK (water_liters IS NULL OR water_liters >= 0),
  average_weight_kg NUMERIC(10,3) CHECK (average_weight_kg IS NULL OR average_weight_kg >= 0),
  medicine_note TEXT,
  vaccination_note TEXT,
  symptoms TEXT,
  observations TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, log_date)
);

CREATE TABLE IF NOT EXISTS market_sources (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('manual', 'external')),
  notes TEXT
);

INSERT INTO market_sources (id, name_ar, kind, notes) VALUES
  ('manual', 'إدخال يدوي', 'manual', 'لم يعد مسار الأسعار. الأسعار تُجلب من المرشد للدواجن.'),
  ('elmorshd', 'المرشد للدواجن', 'external', 'بورصة الدواجن اليومية في مصر: فراخ، كتاكيت، ذرة، صويا، وعلف.'),
  ('egypoultry', 'دواجن مصر', 'external', 'بورصة دواجن مصر: الفراخ والكتاكيت. الخامات الناقصة تتسجل من المرشد.')
ON CONFLICT (id) DO UPDATE SET name_ar = EXCLUDED.name_ar, kind = EXCLUDED.kind, notes = EXCLUDED.notes;

CREATE TABLE IF NOT EXISTS market_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  buy_price NUMERIC(14,2) CHECK (buy_price IS NULL OR buy_price >= 0),
  sell_price NUMERIC(14,2) CHECK (sell_price IS NULL OR sell_price >= 0),
  unit TEXT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EGP',
  source_id TEXT NOT NULL REFERENCES market_sources(id),
  source_label TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'manual',
  price_date DATE NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES cycles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('medicine', 'vaccine', 'symptom', 'note')),
  title TEXT NOT NULL,
  dosage TEXT,
  reason TEXT,
  cost NUMERIC(14,2) CHECK (cost IS NULL OR cost >= 0),
  symptoms TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS article_categories (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

INSERT INTO article_categories (id, name_ar, sort_order) VALUES
  ('breeding', 'تربية الدواجن', 1),
  ('feed', 'الأعلاف', 2),
  ('disease', 'الأمراض', 3),
  ('medicine', 'الأدوية', 4),
  ('cycle', 'إدارة الدورة', 5),
  ('market', 'السوق', 6)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES article_categories(id),
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  source_name TEXT,
  source_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  reading_minutes INTEGER NOT NULL DEFAULT 3,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS article_bookmarks (
  article_id UUID PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS article_reads (
  article_id UUID PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  dedupe_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('created', 'edited', 'deleted')),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_cycle_idx ON expenses (cycle_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_supplier_idx ON expenses (supplier_id);
CREATE INDEX IF NOT EXISTS sales_cycle_idx ON sales (cycle_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS sales_customer_idx ON sales (customer_id);
CREATE INDEX IF NOT EXISTS payments_customer_idx ON payments (customer_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS payments_supplier_idx ON payments (supplier_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS daily_logs_cycle_idx ON daily_logs (cycle_id, log_date DESC);
CREATE INDEX IF NOT EXISTS market_prices_lookup_idx ON market_prices (commodity, price_date DESC, recorded_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_item_idx ON inventory_movements (item_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS health_cycle_idx ON health_records (cycle_id, record_date DESC);
CREATE INDEX IF NOT EXISTS articles_category_idx ON articles (category_id);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications (created_at DESC);

INSERT INTO inventory_items (name, category, unit, quantity, min_quantity)
SELECT * FROM (VALUES
  ('علف تسمين', 'feed', 'كجم', 0, 50),
  ('ذرة', 'corn', 'كجم', 0, 0),
  ('صويا', 'soy', 'كجم', 0, 0),
  ('ردة', 'bran', 'كجم', 0, 0),
  ('برسيم', 'clover', 'كجم', 0, 0)
) AS seed(name, category, unit, quantity, min_quantity)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items);

INSERT INTO articles (slug, title, category_id, summary, content, source_name, source_url, tags, reading_minutes)
VALUES
(
  'prepare-house',
  'تجهيز المكان قبل ما الكتاكيت توصل',
  'breeding',
  'المكان لازم يكون نظيف ودافي وجاهز قبل وصول الكتاكيت بيوم على الأقل.',
  $art$هذا ملخص تعليمي مختصر، وليس تعليمات بيطرية.

قبل وصول الكتاكيت:
- نظّف الأرضية والجدران وشيّل بقايا الدورة اللي فاتت.
- سيّب المكان ينشف. الرطوبة بتعب الكتكوت في أول الأيام.
- جهّز الفرشة نظيفة ومتوزعة، من غير تكتلات مبلولة.
- جرّب السقايات والعلافات قبل الوصول، وتأكد إن المية نازلة بسهولة.
- ظبّط الحرارة قبلها بساعات. الكتكوت الصغير بيتأثر بسرعة لو المكان بارد.
- جهّز إضاءة هادية ومتوزعة، من غير منطقة ضلمة أو سخنة زيادة.

أول ما يوصلوا، بص عليهم: لو متجمعين تحت المدفأة يبقى الجو بارد. لو بعيدين عنها وفاتحين مناقيرهم يبقى الجو سخن. لو متوزعين وبيتحركوا يبقى الوضع أقرب للمناسب.

لو لقيت ضعف شديد أو نفوق غير معتاد من أول يوم، كلم الطبيب البيطري. التطبيق بيسجّل الملاحظة، لكنه لا يشخّص.$art$,
  'ملخص تعليمي داخلي مبني على ممارسات التربية الشائعة',
  'https://www.fao.org/poultry-production-products/production/en/',
  ARRAY['تربية','حرارة','تجهيز'],
  3
),
(
  'first-days-heat',
  'الحرارة في أول أسبوعين',
  'breeding',
  'أول أسبوعين هما الأهم. البرد سبب شائع لتجمع الكتاكيت وضعفها.',
  $art$هذا ملخص تعليمي، وليس قياسًا يغنِ عن الترمومتر في المزرعة.

في الأيام الأولى الكتكوت مش قادر يظبط حرارة جسمه كويس. علشان كده:
- راقب سلوك الطيور أكتر من قراءة رقم واحد. التجمع تحت مصدر الحرارة علامة برد. الابتعاد الشديد واللهاث علامة حرارة عالية.
- خفّض الحرارة تدريجيًا مع تقدم العمر، من غير نقلة مفاجئة.
- امنع تيار الهواء المباشر على الكتاكيت، مع تهوية تكفي عشان الجو ما يبقاش خانق.
- الفرشة المبلولة بتبرّد الطيور وبترفع احتمال المشاكل. شيّل الجزء المبلول وبدّله.
- سجّل في المتابعة اليومية أي يوم حصل فيه تجمع أو لهث أو نفوق.

لو النفوق زاد فجأة مع أعراض واضحة، سجّل الملاحظة هنا وكلّم الطبيب البيطري. لا تعتمد على التطبيق في تحديد علاج.$art$,
  'ملخص تعليمي داخلي',
  'https://www.fao.org/poultry-production-products/production/en/',
  ARRAY['حرارة','تهوية'],
  3
),
(
  'feed-and-water',
  'العلف والمية يوم عن يوم',
  'feed',
  'العلف أكبر بند في التكلفة غالبًا. سجّل الاستهلاك عشان تعرف المخزون يكفي كام يوم.',
  $art$هذا شرح لطريقة المتابعة، وليس تركيبة علف جاهزة.

- الكتكوت لازم يلاقي المية والعلف بسهولة من أول ساعة.
- غيّر المية المتسخة. السقاية الوسخة بتسبب مشاكل أسرع من أي حساب.
- سجّل كمية العلف اللي اتستهلكت كل يوم بنفس الوحدة المخزّنة: كجم مع كجم، أو شيكارة مع شيكارة. التطبيق مش بيحوّل الوحدات من نفسه عشان ما يغلطش في حساب الأيام.
- لو المخزون قرب يخلّص، اشترِ قبل ما تقف التغذية. انقطاع العلف بيأثر على الوزن.
- الذرة والصويا والبرسيم خامات مختلفة. سجّل كل واحدة في المخزون لو بتشتريها لوحدها.
- سعر العلف بيتغير. سجّل سعر النهارده في صفحة السوق عشان تقارن الأسبوع والشهر.

التطبيق يحسب «المخزون يكفي تقريبًا كام يوم» فقط لو فيه استهلاك مسجّل بنفس الوحدة.$art$,
  'ملخص تعليمي داخلي',
  NULL,
  ARRAY['علف','مياه','مخزون'],
  3
),
(
  'when-to-sell',
  'أبيع دلوقتي ولا أستنى؟',
  'cycle',
  'قرار البيع تقدير من الوزن والتكلفة وسعر السوق، مش ضمان ربح.',
  $art$التطبيق يقدّر نتيجتين: لو بعت دلوقتي، ولو استنيت أيام إضافية. التقدير مبني على بياناتك الحالية فقط.

قبل القرار راجع:
- عدد الفراخ الموجودة فعليًا، بعد النفوق والبيع.
- متوسط الوزن آخر متابعة. من غير وزن، الحساب يبقى ناقص.
- سعر الكيلو اللي تقدر تبيع بيه النهارده، مش سعر سمعته من أسبوع.
- العلف اللي هيتصرف لو استنيت، وسعره.
- الفلوس اللي لسه هتحتاجها لغاية يوم البيع.

«أقل سعر بيع لتغطية التكلفة» معناه السعر اللي يرجّع المصروف، من غير ربح. لو سعر السوق أقل منه، البيع دلوقتي بيغطي جزء من التكلفة فقط.

لا تعتبر الرقم قرارًا نهائيًا. السوق بيتغير، والوزن اليومي تقدير تقدر تعدّله من الإعدادات.$art$,
  'ملخص تعليمي داخلي',
  NULL,
  ARRAY['بيع','ربح','تكلفة'],
  3
),
(
  'cost-per-kilo',
  'تكلفة الكيلو بتتحسب إزاي',
  'cycle',
  'تكلفة الكيلو = كل اللي اتصرَف على الدورة مقسوم على وزن الفراخ الموجودة.',
  $art$التطبيق يعمل الحساب على السيرفر من المصاريف والوزن المسجّلين.

- إجمالي المصاريف يشمل الكتاكيت والعلف والدواء والكهرباء وأي بند سجّلته على الدورة.
- تكلفة الفرخة الموجودة = المصاريف ÷ عدد الفراخ الحالي.
- تكلفة الكيلو التقريبية = المصاريف ÷ (عدد الفراخ الحالي × متوسط الوزن).
- لو لسه ما سجلتش وزن، التطبيق مش هيختلق تكلفة كيلو.
- المبيعات والمتبقي عند الناس ظاهرين لوحدهم. صافي النتيجة = المبيعات − المصاريف.

النفوق بيرفع تكلفة الفرخة العايشة، لأن المصروف حصل والعدد قل. علشان كده تسجيل النفوق يوم بيوم مهم للحساب.$art$,
  'ملخص تعليمي داخلي',
  NULL,
  ARRAY['تكلفة','ربح'],
  2
),
(
  'call-the-vet',
  'امتى لازم تكلم الطبيب البيطري',
  'disease',
  'سجّل اللي شايفه، ولو الأعراض شديدة أو النفوق زاد فجأة كلم الطبيب. التطبيق لا يشخّص.',
  $art$المعلومات هنا للتعلم والمتابعة فقط، وليست تشخيصًا أو وصفة علاج.

كلم الطبيب البيطري لو شفت واحد أو أكثر من الآتي:
- نفوق زاد فجأة عن المعتاد في المزرعة.
- طيور خاملة جدًا، أو رافضة العلف والمية.
- إسهال شديد، أو دم، أو أعراض تنفسية واضحة على عدد كبير.
- أعراض بعد تغيير العلف أو بعد زحمة أو بعد عطل في التهوية.
- أي حالة مش فاهم سببها وبتزيد خلال ساعات.

قبل المكالمة سجّل في التطبيق: التاريخ، عدد النافق، العمر، آخر علف، وآخر دواء اتصرف. الكلام ده يساعد الطبيب. لا تغيّر جرعة من عندك بناءً على مقال.

الأدوية المسجّلة في التطبيق هي اللي استخدمتها أنت، بالمعلومة التي كتبتها، وليست توصية من النظام.$art$,
  'تنبيه تعليمي — راجع الطبيب البيطري',
  NULL,
  ARRAY['صحة','بيطري','نفوق'],
  3
)
ON CONFLICT (slug) DO NOTHING;
