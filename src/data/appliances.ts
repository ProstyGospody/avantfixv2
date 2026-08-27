export interface Fault {
  slug: string;

  title: string;

  short?: string;

  symptom: string;
  causes: string[];

  priceFrom: number;

  durationMin: number;
}

export interface PriceRow {
  work: string;
  priceFrom: number;
  durationMin: number;
}

export interface Appliance {
  slug: string;

  singular: string;

  accusative: string;

  genitivePlural: string;

  prepSingular: string;

  genitiveSingular: string;

  short: string;

  mounted: 'floor' | 'wall';

  platePlace: string;

  diagnosticsPrice: number;

  priceFrom: number;
  brands: string[];
  faults: Fault[];
  priceList: PriceRow[];
}

const LAUNDRY_BRANDS = [
  'Bosch', 'Samsung', 'LG', 'Indesit', 'Ariston', 'Candy', 'Electrolux',
  'Beko', 'Whirlpool', 'Hansa', 'Gorenje', 'Zanussi', 'Haier', 'Atlant', 'Siemens',
  'AEG', 'Miele', 'Asko',
];

const DISH_BRANDS = [...LAUNDRY_BRANDS, 'Neff', 'Smeg'];

const COOLING_BRANDS = [
  'Atlant', 'Indesit', 'Bosch', 'Samsung', 'LG', 'Liebherr', 'Beko',
  'Biryusa', 'Nord', 'Electrolux', 'Whirlpool', 'Haier', 'Hotpoint-Ariston', 'Gorenje',
  'AEG', 'Miele', 'Smeg',
];

const OVEN_BRANDS = [
  'Bosch', 'Electrolux', 'Gorenje', 'Hansa', 'Samsung', 'Ariston', 'Beko',
  'Zanussi', 'Siemens', 'Whirlpool', 'Candy', 'Darina', 'Gefest', 'Maunfeld', 'Weissgauff',
  'AEG', 'Miele', 'Neff', 'Smeg', 'Asko',
];

const HOOD_BRANDS = [
  'Elikor', 'Krona', 'Maunfeld', 'Bosch', 'Gorenje', 'Hansa', 'Faber',
  'Cata', 'Shindo', 'Lex', 'Kuppersberg', 'Weissgauff', 'Elica', 'Jetair',
  'AEG', 'Miele', 'Smeg',
];

export const APPLIANCES: Appliance[] = [
  {
    slug: 'remont-stiralnyh-mashin',
    singular: 'стиральная машина',
    accusative: 'стиральную машину',
    genitivePlural: 'стиральных машин',
    prepSingular: 'стиральной машине',
    genitiveSingular: 'стиральной машины',
    short: 'Стиральные машины',
    mounted: 'floor',
    platePlace:
      'Откройте люк — наклейка с моделью обычно на верхнем крае бака или на самом ободе люка. Если там пусто, посмотрите на задней стенке и на цоколе под передней панелью.',
    diagnosticsPrice: 0,
    priceFrom: 500,
    brands: LAUNDRY_BRANDS,
    faults: [
      {
        slug: 'ne-slivaet-vodu',
        title: 'Стиральная машина не сливает воду',
        symptom: 'вода остаётся в баке после стирки, бельё мокрое',
        causes: ['Засор сливного фильтра или патрубка', 'Вышел из строя сливной насос', 'Обрыв в цепи помпы', 'Сбой модуля управления'],
        priceFrom: 900,
        durationMin: 60,
      },
      {
        slug: 'ne-otzhimaet',
        title: 'Стиральная машина не отжимает бельё',
        symptom: 'барабан не набирает обороты в конце цикла',
        causes: ['Износ угольных щёток двигателя', 'Растянут или слетел приводной ремень', 'Неисправен таходатчик', 'Дисбаланс загрузки', 'Не сливается вода перед отжимом', 'Отказ модуля управления'],
        priceFrom: 1200,
        durationMin: 90,
      },
      {
        slug: 'shumit-pri-otzhime',
        title: 'Стиральная машина шумит и гремит при отжиме',
        symptom: 'гул, скрежет или стук на высоких оборотах',
        causes: ['Разрушены подшипники барабана', 'Износ амортизаторов и пружин', 'Посторонний предмет между баком и барабаном', 'Ослабление противовеса'],
        priceFrom: 3500,
        durationMin: 240,
      },
      {
        slug: 'ne-greet-vodu',
        title: 'Стиральная машина не греет воду',
        symptom: 'бельё стирается в холодной воде, стекло люка не запотевает',
        causes: ['Перегорел ТЭН', 'Накипь и обрыв цепи нагрева', 'Неисправен датчик температуры', 'Сбой управляющего модуля'],
        priceFrom: 1400,
        durationMin: 90,
      },
      {
        slug: 'ne-nabiraet-vodu',
        title: 'Стиральная машина не набирает воду',
        symptom: 'программа запускается, но вода не поступает в бак',
        causes: ['Засор заливного фильтра-сеточки', 'Отказ впускного клапана', 'Неисправен прессостат', 'Не заблокирован люк'],
        priceFrom: 900,
        durationMin: 60,
      },
      {
        slug: 'ne-otkryvaetsya-lyuk',
        title: 'Не открывается люк стиральной машины',
        short: 'Не открывается люк',
        symptom: 'дверца заблокирована после окончания стирки',
        causes: ['Заклинил замок УБЛ', 'Вода не слита — блокировка по уровню', 'Деформация язычка или петель', 'Ошибка модуля управления'],
        priceFrom: 1100,
        durationMin: 60,
      },
      {
        slug: 'techet-voda',
        title: 'Течёт стиральная машина',
        short: 'Течёт вода',
        symptom: 'лужа под машиной во время или после стирки',
        causes: ['Повреждён сливной или заливной патрубок', 'Износ манжеты люка', 'Трещина в баке или дозаторе', 'Ослаблены хомуты'],
        priceFrom: 1200,
        durationMin: 90,
      },
      {
        slug: 'ne-vklyuchaetsya',
        title: 'Стиральная машина не включается',
        symptom: 'нет реакции на кнопку, не горит индикация',
        causes: ['Неисправна кнопка или сетевой фильтр', 'Обрыв шнура питания', 'Сгорел модуль управления', 'Нет напряжения в розетке'],
        priceFrom: 900,
        durationMin: 60,
      },
    ],
    priceList: [
      { work: 'Диагностика (бесплатно при согласии на ремонт)', priceFrom: 0, durationMin: 30 },
      { work: 'Замена сливного насоса', priceFrom: 900, durationMin: 60 },
      { work: 'Замена ТЭНа', priceFrom: 1400, durationMin: 90 },
      { work: 'Замена подшипников барабана', priceFrom: 3500, durationMin: 240 },
      { work: 'Замена приводного ремня', priceFrom: 700, durationMin: 40 },
      { work: 'Замена щёток двигателя', priceFrom: 1200, durationMin: 90 },
      { work: 'Замена УБЛ (замка люка)', priceFrom: 1100, durationMin: 60 },
      { work: 'Замена манжеты люка', priceFrom: 1600, durationMin: 90 },
      { work: 'Замена прессостата', priceFrom: 1000, durationMin: 60 },
      { work: 'Ремонт модуля управления', priceFrom: 2200, durationMin: 180 },
      { work: 'Устранение засора сливной системы', priceFrom: 800, durationMin: 60 },
      { work: 'Замена амортизаторов', priceFrom: 1500, durationMin: 120 },
    ],
  },

  {
    slug: 'remont-posudomoechnyh-mashin',
    singular: 'посудомоечная машина',
    accusative: 'посудомоечную машину',
    genitivePlural: 'посудомоечных машин',
    prepSingular: 'посудомоечной машине',
    genitiveSingular: 'посудомоечной машины',
    short: 'Посудомоечные машины',
    mounted: 'floor',
    platePlace:
      'Откройте дверцу и посмотрите на её торце — узкая наклейка идёт по правому или левому краю. У встроенных моделей она же дублируется на боковой стенке корпуса.',
    diagnosticsPrice: 0,
    priceFrom: 600,
    brands: DISH_BRANDS,
    faults: [
      {
        slug: 'ne-moet-posudu',
        title: 'Посудомоечная машина плохо моет посуду',
        symptom: 'на тарелках остаются налёт и остатки пищи',
        causes: ['Забиты форсунки коромысел', 'Засор фильтра грубой очистки', 'Слабый напор циркуляционного насоса', 'Неверная дозировка средства', 'Коромысла заклинило посудой', 'Не работает регенерация ионообменника'],
        priceFrom: 900,
        durationMin: 60,
      },
      {
        slug: 'ne-slivaet-vodu',
        title: 'Посудомоечная машина не сливает воду',
        symptom: 'вода стоит в поддоне после окончания цикла',
        causes: ['Засор сливного фильтра и шланга', 'Отказ дренажного насоса', 'Неверное подключение слива к сифону', 'Ошибка модуля управления'],
        priceFrom: 1000,
        durationMin: 60,
      },
      {
        slug: 'ne-greet-vodu',
        title: 'Посудомоечная машина не греет воду',
        symptom: 'посуда моется холодной водой и не сохнет',
        causes: ['Неисправен проточный нагреватель', 'Отказ термодатчика NTC', 'Накипь на нагревательном блоке', 'Пробой реле нагрева на плате'],
        priceFrom: 1800,
        durationMin: 120,
      },
      {
        slug: 'ne-nabiraet-vodu',
        title: 'Посудомоечная машина не набирает воду',
        symptom: 'программа стартует, но вода не поступает',
        causes: ['Закрыт или засорён впускной кран', 'Отказ клапана залива', 'Сработала защита Aquastop', 'Неисправен датчик уровня'],
        priceFrom: 1000,
        durationMin: 60,
      },
      {
        slug: 'techet',
        title: 'Течёт посудомоечная машина',
        short: 'Течёт вода',
        symptom: 'вода под корпусом, срабатывает защита от протечек',
        causes: ['Износ уплотнителя двери', 'Повреждение патрубков или хомутов', 'Трещина в поддоне', 'Обильная пена из-за неподходящего средства'],
        priceFrom: 1300,
        durationMin: 90,
      },
      {
        slug: 'ne-vklyuchaetsya',
        title: 'Посудомоечная машина не включается',
        symptom: 'нет индикации, не реагирует на кнопки',
        causes: ['Нет питания или неисправна кнопка', 'Сгорел сетевой фильтр', 'Отказ модуля управления', 'Не замыкается концевик двери'],
        priceFrom: 1000,
        durationMin: 60,
      },
    ],
    priceList: [
      { work: 'Диагностика (бесплатно при согласии на ремонт)', priceFrom: 0, durationMin: 30 },
      { work: 'Чистка фильтров и форсунок', priceFrom: 900, durationMin: 60 },
      { work: 'Замена сливного насоса', priceFrom: 1000, durationMin: 60 },
      { work: 'Замена проточного нагревателя', priceFrom: 1800, durationMin: 120 },
      { work: 'Замена циркуляционного насоса', priceFrom: 2200, durationMin: 150 },
      { work: 'Замена клапана залива воды', priceFrom: 1000, durationMin: 60 },
      { work: 'Замена уплотнителя двери', priceFrom: 1200, durationMin: 60 },
      { work: 'Ремонт модуля управления', priceFrom: 2400, durationMin: 180 },
      { work: 'Замена датчика уровня (прессостата)', priceFrom: 1100, durationMin: 60 },
      { work: 'Регулировка и ремонт петель двери', priceFrom: 900, durationMin: 60 },
    ],
  },

  {
    slug: 'remont-sushilnyh-mashin',
    singular: 'сушильная машина',
    accusative: 'сушильную машину',
    genitivePlural: 'сушильных машин',
    prepSingular: 'сушильной машине',
    genitiveSingular: 'сушильной машины',
    short: 'Сушильные машины',
    mounted: 'floor',
    platePlace:
      'Наклейка чаще всего на ободе люка или на его торце при открытой дверце. Второе место — задняя стенка, ближе к верхнему краю.',
    diagnosticsPrice: 0,
    priceFrom: 800,
    brands: LAUNDRY_BRANDS,
    faults: [
      {
        slug: 'ne-sushit',
        title: 'Сушильная машина не сушит бельё',
        symptom: 'цикл проходит, но вещи остаются влажными',
        causes: ['Забит фильтр ворса и теплообменник', 'Отказ компрессора теплового насоса', 'Неисправен ТЭН в конденсационной модели', 'Ошибка датчика влажности'],
        priceFrom: 1500,
        durationMin: 120,
      },
      {
        slug: 'ne-greet',
        title: 'Сушильная машина не греет',
        symptom: 'барабан крутится, но воздух холодный',
        causes: ['Перегорел нагревательный элемент', 'Сработал термостат защиты от перегрева', 'Утечка хладагента в тепловом насосе', 'Обрыв в цепи нагрева'],
        priceFrom: 1700,
        durationMin: 120,
      },
      {
        slug: 'ne-krutitsya-baraban',
        title: 'Не крутится барабан сушильной машины',
        short: 'Не крутится барабан',
        symptom: 'машина гудит, но бельё не двигается',
        causes: ['Порван приводной ремень', 'Заклинили ролики или подшипник', 'Отказ приводного двигателя', 'Барабан заблокирован посторонним предметом'],
        priceFrom: 1600,
        durationMin: 120,
      },
      {
        slug: 'shumit',
        title: 'Сушильная машина сильно шумит',
        symptom: 'скрежет, стук или свист при работе',
        causes: ['Износ опорных роликов', 'Разрушение подшипника вала', 'Ослабление натяжного механизма', 'Посторонний предмет в улитке вентилятора'],
        priceFrom: 2000,
        durationMin: 180,
      },
      {
        slug: 'ne-slivaet-kondensat',
        title: 'Сушильная машина не сливает конденсат',
        symptom: 'бак для воды переполняется или остаётся пустым',
        causes: ['Засор дренажного контура', 'Отказ насоса откачки конденсата', 'Неисправен датчик уровня бака', 'Загрязнён теплообменник'],
        priceFrom: 1400,
        durationMin: 90,
      },
      {
        slug: 'ne-vklyuchaetsya',
        title: 'Сушильная машина не включается',
        symptom: 'нет реакции на кнопку питания',
        causes: ['Нет напряжения или неисправна кнопка', 'Отказ модуля управления', 'Не срабатывает концевик дверцы', 'Сгорел сетевой фильтр'],
        priceFrom: 1100,
        durationMin: 60,
      },
    ],
    priceList: [
      { work: 'Диагностика (бесплатно при согласии на ремонт)', priceFrom: 0, durationMin: 30 },
      { work: 'Чистка теплообменника и воздуховодов', priceFrom: 1500, durationMin: 120 },
      { work: 'Замена нагревательного элемента', priceFrom: 1700, durationMin: 120 },
      { work: 'Замена приводного ремня', priceFrom: 1000, durationMin: 60 },
      { work: 'Замена опорных роликов', priceFrom: 1800, durationMin: 150 },
      { work: 'Замена насоса конденсата', priceFrom: 1400, durationMin: 90 },
      { work: 'Замена датчика влажности', priceFrom: 1300, durationMin: 90 },
      { work: 'Ремонт модуля управления', priceFrom: 2600, durationMin: 180 },
      { work: 'Заправка контура теплового насоса', priceFrom: 4500, durationMin: 240 },
    ],
  },

  {
    slug: 'remont-vytyazhek',
    singular: 'кухонная вытяжка',
    accusative: 'кухонную вытяжку',
    genitivePlural: 'вытяжек',
    prepSingular: 'вытяжке',
    genitiveSingular: 'вытяжки',
    short: 'Вытяжки',
    mounted: 'wall',
    platePlace:
      'Снимите жироулавливающий фильтр — шильдик внутри корпуса, на металле над фильтром. Снаружи на вытяжках его почти никогда не бывает.',
    diagnosticsPrice: 0,
    priceFrom: 500,
    brands: HOOD_BRANDS,
    faults: [
      {
        slug: 'ne-tyanet',
        title: 'Вытяжка не тянет воздух',
        short: 'Не тянет воздух',
        symptom: 'запахи и пар остаются на кухне',
        causes: ['Забиты жировые фильтры', 'Исчерпан ресурс угольного фильтра', 'Засор воздуховода', 'Падение оборотов двигателя', 'Износ подшипников крыльчатки', 'Обратная тяга в вентканале'],
        priceFrom: 800,
        durationMin: 60,
      },
      {
        slug: 'ne-vklyuchaetsya',
        title: 'Вытяжка не включается',
        short: 'Не включается',
        symptom: 'нет реакции на кнопки, не горит подсветка',
        causes: ['Обрыв питания или неисправна кнопка', 'Сгорел конденсатор двигателя', 'Отказ платы управления', 'Окисление контактов'],
        priceFrom: 700,
        durationMin: 60,
      },
      {
        slug: 'gudit-shumit',
        title: 'Вытяжка сильно гудит и вибрирует',
        short: 'Сильно гудит и вибрирует',
        symptom: 'громкий гул и дребезг корпуса при работе',
        causes: ['Износ подшипников двигателя', 'Дисбаланс крыльчатки от жирового налёта', 'Ослабление креплений к стене', 'Деформация воздуховода'],
        priceFrom: 1200,
        durationMin: 90,
      },
      {
        slug: 'ne-rabotaet-podsvetka',
        title: 'Не работает подсветка вытяжки',
        short: 'Не работает подсветка',
        symptom: 'лампы не горят, вентилятор при этом работает',
        causes: ['Перегорели лампы или LED-модуль', 'Неисправен выключатель', 'Обрыв в проводке', 'Отказ драйвера подсветки'],
        priceFrom: 500,
        durationMin: 40,
      },
      {
        slug: 'ne-pereklyuchayutsya-rezhimy',
        title: 'Не переключаются режимы вытяжки',
        short: 'Не переключаются режимы',
        symptom: 'работает только одна скорость или ни одной',
        causes: ['Износ кнопочного блока', 'Неисправен сенсорный модуль', 'Обрыв обмотки двигателя', 'Сбой платы управления'],
        priceFrom: 900,
        durationMin: 60,
      },
      {
        slug: 'zamena-dvigatelya',
        title: 'Замена двигателя вытяжки',
        short: 'Замена двигателя',
        symptom: 'мотор не запускается или сгорел',
        causes: ['Перегрев из-за засора', 'Износ подшипников', 'Пробой обмотки', 'Скачок напряжения в сети'],
        priceFrom: 1500,
        durationMin: 120,
      },
    ],
    priceList: [
      { work: 'Диагностика (бесплатно при согласии на ремонт)', priceFrom: 0, durationMin: 30 },
      { work: 'Чистка вытяжки и замена фильтров', priceFrom: 800, durationMin: 60 },
      { work: 'Замена двигателя', priceFrom: 1500, durationMin: 120 },
      { work: 'Замена конденсатора', priceFrom: 700, durationMin: 40 },
      { work: 'Замена кнопочного или сенсорного блока', priceFrom: 900, durationMin: 60 },
      { work: 'Замена подсветки', priceFrom: 500, durationMin: 40 },
      { work: 'Ремонт платы управления', priceFrom: 1600, durationMin: 120 },
      { work: 'Замена крыльчатки', priceFrom: 1100, durationMin: 90 },
      { work: 'Монтаж и подключение воздуховода', priceFrom: 1200, durationMin: 90 },
    ],
  },

  {
    slug: 'remont-duhovyh-shkafov',
    singular: 'духовой шкаф',
    accusative: 'духовой шкаф',
    genitivePlural: 'духовых шкафов',
    prepSingular: 'духовом шкафу',
    genitiveSingular: 'духового шкафа',
    short: 'Духовые шкафы',
    mounted: 'floor',
    platePlace:
      'Откройте дверцу: наклейка на её торце или на боковой стойке рамы, куда дверца прилегает. У встроенных моделей бывает сверху на корпусе.',
    diagnosticsPrice: 0,
    priceFrom: 700,
    brands: OVEN_BRANDS,
    faults: [
      {
        slug: 'ne-greet',
        title: 'Духовой шкаф не греет',
        symptom: 'включается, но температура не поднимается',
        causes: ['Перегорел верхний или нижний ТЭН', 'Отказ термостата', 'Сработала защита от перегрева', 'Неисправно реле на плате управления'],
        priceFrom: 1500,
        durationMin: 120,
      },
      {
        slug: 'ne-derzhit-temperaturu',
        title: 'Духовой шкаф не держит температуру',
        symptom: 'выпечка подгорает или не пропекается',
        causes: ['Разъюстирован термостат', 'Отказ датчика температуры', 'Износ уплотнителя дверцы', 'Сбита калибровка электроники'],
        priceFrom: 1300,
        durationMin: 90,
      },
      {
        slug: 'ne-vklyuchaetsya',
        title: 'Духовой шкаф не включается',
        symptom: 'нет индикации и нагрева',
        causes: ['Нет питания на клеммнике', 'Неисправен блок кнопок или сенсор', 'Сгорела плата управления', 'Обрыв в силовой проводке'],
        priceFrom: 1200,
        durationMin: 90,
      },
      {
        slug: 'ne-rabotaet-konvekciya',
        title: 'Не работает конвекция в духовом шкафу',
        short: 'Не работает конвекция',
        symptom: 'вентилятор не вращается, режим недоступен',
        causes: ['Отказ двигателя конвекции', 'Заклинила крыльчатка', 'Обрыв кольцевого ТЭНа', 'Сбой платы управления'],
        priceFrom: 1600,
        durationMin: 120,
      },
      {
        slug: 'ne-zakryvaetsya-dverca',
        title: 'Не закрывается дверца духового шкафа',
        short: 'Не закрывается дверца',
        symptom: 'дверца провисла, из щели идёт жар',
        causes: ['Износ или поломка петель', 'Растянут уплотнитель', 'Деформация стекла и рамки', 'Ослабление крепежа'],
        priceFrom: 1400,
        durationMin: 90,
      },
      {
        slug: 'oshibka-na-displee',
        title: 'Духовой шкаф показывает ошибку на дисплее',
        symptom: 'на табло код ошибки, программы не запускаются',
        causes: ['Отказ температурного датчика', 'Залипание сенсорной панели', 'Сбой прошивки модуля', 'Скачок напряжения'],
        priceFrom: 1500,
        durationMin: 120,
      },
    ],
    priceList: [
      { work: 'Диагностика (бесплатно при согласии на ремонт)', priceFrom: 0, durationMin: 30 },
      { work: 'Замена ТЭНа (верхний или нижний)', priceFrom: 1500, durationMin: 120 },
      { work: 'Замена кольцевого ТЭНа конвекции', priceFrom: 1700, durationMin: 120 },
      { work: 'Замена термостата', priceFrom: 1300, durationMin: 90 },
      { work: 'Замена датчика температуры', priceFrom: 1200, durationMin: 90 },
      { work: 'Замена двигателя конвекции', priceFrom: 1600, durationMin: 120 },
      { work: 'Замена петель и уплотнителя дверцы', priceFrom: 1400, durationMin: 90 },
      { work: 'Замена стекла дверцы', priceFrom: 1500, durationMin: 90 },
      { work: 'Ремонт платы управления', priceFrom: 2400, durationMin: 180 },
      { work: 'Замена сенсорной панели', priceFrom: 2000, durationMin: 120 },
    ],
  },

  {
    slug: 'remont-holodilnikov',
    singular: 'холодильник',
    accusative: 'холодильник',
    genitivePlural: 'холодильников',
    prepSingular: 'холодильнике',
    genitiveSingular: 'холодильника',
    short: 'Холодильники',
    mounted: 'floor',
    platePlace:
      'Внутри холодильной камеры: на боковой стенке ближе к низу или под ящиками для овощей. Иногда на задней стенке снаружи, рядом с компрессором.',
    diagnosticsPrice: 0,
    priceFrom: 700,
    brands: COOLING_BRANDS,
    faults: [
      {
        slug: 'ne-morozit',
        title: 'Холодильник не морозит',
        symptom: 'продукты портятся, в камере тепло',
        causes: ['Утечка хладагента', 'Отказ компрессора', 'Засор капиллярной трубки', 'Неисправно пусковое реле', 'Неплотное прилегание уплотнителя двери', 'Сбой блока управления'],
        priceFrom: 2500,
        durationMin: 180,
      },
      {
        slug: 'ne-otklyuchaetsya',
        title: 'Холодильник работает без остановки',
        symptom: 'компрессор гудит постоянно и не уходит в паузу',
        causes: ['Утечка фреона', 'Неисправен термостат или датчик', 'Нарушена герметичность уплотнителя', 'Испаритель забит льдом'],
        priceFrom: 2000,
        durationMin: 150,
      },
      {
        slug: 'namerzaet-led',
        title: 'В холодильнике намерзает лёд',
        short: 'Намерзает лёд',
        symptom: 'на задней стенке толстый слой наледи, «снежная шуба»',
        causes: ['Отказ системы No Frost', 'Неисправен ТЭН оттайки', 'Засор дренажного отверстия', 'Износ уплотнителя двери'],
        priceFrom: 1800,
        durationMin: 150,
      },
      {
        slug: 'techet-voda',
        title: 'Из холодильника течёт вода',
        short: 'Течёт вода',
        symptom: 'лужа под нижним ящиком или на полу',
        causes: ['Засор дренажной системы', 'Обмерзание сливного канала', 'Треснул поддон конденсата', 'Негерметичная дверь'],
        priceFrom: 1200,
        durationMin: 90,
      },
      {
        slug: 'shumit-gudit',
        title: 'Холодильник сильно шумит и гудит',
        symptom: 'посторонний треск, вибрация, громкий гул',
        causes: ['Износ компрессора', 'Ослабли амортизаторы мотора', 'Задевает вентилятор No Frost', 'Неровная установка корпуса'],
        priceFrom: 1500,
        durationMin: 120,
      },
      {
        slug: 'ne-vklyuchaetsya',
        title: 'Холодильник не включается',
        symptom: 'нет света в камере и звука компрессора',
        causes: ['Нет питания в розетке или обрыв шнура', 'Сгорело пусковое реле', 'Отказ блока управления', 'Заклинил компрессор'],
        priceFrom: 1400,
        durationMin: 90,
      },
    ],
    priceList: [
      { work: 'Диагностика (бесплатно при согласии на ремонт)', priceFrom: 0, durationMin: 30 },
      { work: 'Заправка фреоном с устранением утечки', priceFrom: 3500, durationMin: 240 },
      { work: 'Замена компрессора', priceFrom: 5000, durationMin: 300 },
      { work: 'Замена пускового реле', priceFrom: 1400, durationMin: 60 },
      { work: 'Замена термостата', priceFrom: 1600, durationMin: 90 },
      { work: 'Ремонт системы No Frost', priceFrom: 1800, durationMin: 150 },
      { work: 'Замена ТЭНа оттайки', priceFrom: 2000, durationMin: 180 },
      { work: 'Чистка дренажной системы', priceFrom: 1200, durationMin: 90 },
      { work: 'Замена уплотнителя двери', priceFrom: 1800, durationMin: 90 },
      { work: 'Замена вентилятора испарителя', priceFrom: 1700, durationMin: 120 },
      { work: 'Ремонт блока управления', priceFrom: 2600, durationMin: 180 },
      { work: 'Перевешивание двери', priceFrom: 1200, durationMin: 60 },
    ],
  },
];

export const APPLIANCE_BY_SLUG = new Map(APPLIANCES.map((a) => [a.slug, a]));

export function localPrice(base: number, factor: number): number {
  if (base === 0) return 0;
  return Math.round((base * factor) / 50) * 50;
}

export function brandSlug(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function faultShort(fault: Fault, appliance: Appliance): string {
  if (fault.short) return fault.short;
  const prefix = appliance.singular.charAt(0).toUpperCase() + appliance.singular.slice(1) + ' ';
  if (!fault.title.startsWith(prefix)) return fault.title;
  const rest = fault.title.slice(prefix.length);
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
