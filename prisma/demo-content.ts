/* Demo course content (Web Design: Photoshop + Illustrator). Regular DB data, editable in the Teacher Panel.
 * Used by `npm run db:seed` and by the first-run /setup page. */
import type { PrismaClient, Software, QuestionType } from "@prisma/client";

type Q = { type: QuestionType; text: string; options: [string, boolean][]; explanation?: string };
type LessonSeed = {
  title: string;
  summary: string;
  minutes: number;
  lecture: string;
  practice: {
    title: string;
    goal: string;
    minutes: number;
    steps: { title: string; body: string }[];
    requirements: string[];
    criteria: string[];
  };
  quiz: Q[];
  hotkeys: string[]; // keys of HOTKEYS
};

const tf = (text: string, correct: boolean, explanation?: string): Q => ({
  type: "TRUE_FALSE",
  text,
  options: [
    ["Верно", correct],
    ["Неверно", !correct],
  ],
  explanation,
});

// ─────────────────────────── Hotkeys ───────────────────────────
const HOTKEYS: Record<string, { software: Software; action: string; keys: string; macKeys?: string }> = {
  undo: { software: "GENERAL", action: "Отменить последнее действие", keys: "Ctrl+Z", macKeys: "Cmd+Z" },
  copy: { software: "GENERAL", action: "Копировать", keys: "Ctrl+C", macKeys: "Cmd+C" },
  paste: { software: "GENERAL", action: "Вставить", keys: "Ctrl+V", macKeys: "Cmd+V" },
  save: { software: "GENERAL", action: "Сохранить файл", keys: "Ctrl+S", macKeys: "Cmd+S" },
  saveAs: { software: "GENERAL", action: "Сохранить как…", keys: "Ctrl+Shift+S", macKeys: "Cmd+Shift+S" },
  selectAll: { software: "GENERAL", action: "Выделить всё", keys: "Ctrl+A", macKeys: "Cmd+A" },
  zoomIn: { software: "GENERAL", action: "Увеличить масштаб", keys: "Ctrl+=", macKeys: "Cmd+=" },
  zoomOut: { software: "GENERAL", action: "Уменьшить масштаб", keys: "Ctrl+-", macKeys: "Cmd+-" },
  fit: { software: "GENERAL", action: "Показать документ целиком", keys: "Ctrl+0", macKeys: "Cmd+0" },
  newDoc: { software: "GENERAL", action: "Создать новый документ", keys: "Ctrl+N", macKeys: "Cmd+N" },

  psMove: { software: "PHOTOSHOP", action: "Инструмент «Перемещение» (Move)", keys: "V" },
  psMarquee: { software: "PHOTOSHOP", action: "Прямоугольная область (Marquee)", keys: "M" },
  psLasso: { software: "PHOTOSHOP", action: "Лассо (Lasso)", keys: "L" },
  psQuick: { software: "PHOTOSHOP", action: "Быстрое выделение / Волшебная палочка", keys: "W" },
  psBrush: { software: "PHOTOSHOP", action: "Кисть (Brush)", keys: "B" },
  psEraser: { software: "PHOTOSHOP", action: "Ластик (Eraser)", keys: "E" },
  psPen: { software: "PHOTOSHOP", action: "Перо (Pen)", keys: "P" },
  psType: { software: "PHOTOSHOP", action: "Текст (Type)", keys: "T" },
  psCrop: { software: "PHOTOSHOP", action: "Рамка (Crop)", keys: "C" },
  psFreeT: { software: "PHOTOSHOP", action: "Свободное трансформирование", keys: "Ctrl+T", macKeys: "Cmd+T" },
  psDeselect: { software: "PHOTOSHOP", action: "Снять выделение", keys: "Ctrl+D", macKeys: "Cmd+D" },
  psInverse: { software: "PHOTOSHOP", action: "Инвертировать выделение", keys: "Ctrl+Shift+I", macKeys: "Cmd+Shift+I" },
  psNewLayer: { software: "PHOTOSHOP", action: "Новый слой", keys: "Ctrl+Shift+N", macKeys: "Cmd+Shift+N" },
  psDupLayer: { software: "PHOTOSHOP", action: "Дублировать слой / скопировать выделение на новый слой", keys: "Ctrl+J", macKeys: "Cmd+J" },
  psClip: { software: "PHOTOSHOP", action: "Создать обтравочную маску (Clipping Mask)", keys: "Ctrl+Alt+G", macKeys: "Cmd+Option+G" },
  psSelectMask: { software: "PHOTOSHOP", action: "Открыть Select and Mask", keys: "Ctrl+Alt+R", macKeys: "Cmd+Option+R" },
  psDefaultColors: { software: "PHOTOSHOP", action: "Цвета по умолчанию (чёрный / белый)", keys: "D" },
  psSwapColors: { software: "PHOTOSHOP", action: "Поменять основной и фоновый цвет", keys: "X" },
  psBrushSmaller: { software: "PHOTOSHOP", action: "Уменьшить размер кисти", keys: "[" },
  psBrushBigger: { software: "PHOTOSHOP", action: "Увеличить размер кисти", keys: "]" },
  psInvert: { software: "PHOTOSHOP", action: "Инвертировать цвета (например, маски)", keys: "Ctrl+I", macKeys: "Cmd+I" },

  aiSelect: { software: "ILLUSTRATOR", action: "Выделение (Selection)", keys: "V" },
  aiDirect: { software: "ILLUSTRATOR", action: "Прямое выделение (Direct Selection)", keys: "A" },
  aiPen: { software: "ILLUSTRATOR", action: "Перо (Pen)", keys: "P" },
  aiAddAnchor: { software: "ILLUSTRATOR", action: "Добавить опорную точку", keys: "=" },
  aiDelAnchor: { software: "ILLUSTRATOR", action: "Удалить опорную точку", keys: "-" },
  aiAnchor: { software: "ILLUSTRATOR", action: "Инструмент «Опорная точка» (Anchor Point)", keys: "Shift+C" },
  aiRect: { software: "ILLUSTRATOR", action: "Прямоугольник", keys: "M" },
  aiEllipse: { software: "ILLUSTRATOR", action: "Эллипс", keys: "L" },
  aiBrush: { software: "ILLUSTRATOR", action: "Кисть (Paintbrush)", keys: "B" },
  aiBlob: { software: "ILLUSTRATOR", action: "Кисть-клякса (Blob Brush)", keys: "Shift+B" },
  aiType: { software: "ILLUSTRATOR", action: "Текст (Type)", keys: "T" },
  aiRotate: { software: "ILLUSTRATOR", action: "Поворот (Rotate)", keys: "R" },
  aiScale: { software: "ILLUSTRATOR", action: "Масштаб (Scale)", keys: "S" },
  aiWidth: { software: "ILLUSTRATOR", action: "Ширина (Width Tool)", keys: "Shift+W" },
  aiWarp: { software: "ILLUSTRATOR", action: "Деформация (Warp)", keys: "Shift+R" },
  aiFreeT: { software: "ILLUSTRATOR", action: "Свободное трансформирование", keys: "E" },
  aiGroup: { software: "ILLUSTRATOR", action: "Сгруппировать", keys: "Ctrl+G", macKeys: "Cmd+G" },
  aiUngroup: { software: "ILLUSTRATOR", action: "Разгруппировать", keys: "Ctrl+Shift+G", macKeys: "Cmd+Shift+G" },
  aiJoin: { software: "ILLUSTRATOR", action: "Соединить точки (Join)", keys: "Ctrl+J", macKeys: "Cmd+J" },
  aiOutline: { software: "ILLUSTRATOR", action: "Режим контуров (Outline)", keys: "Ctrl+Y", macKeys: "Cmd+Y" },
  aiClip: { software: "ILLUSTRATOR", action: "Создать обтравочную маску", keys: "Ctrl+7", macKeys: "Cmd+7" },
};

// ─────────────────────────── Lessons ───────────────────────────
function simpleLecture(title: string, intro: string, sections: [string, string][], tip: string) {
  return [
    intro,
    ...sections.map(([h, b]) => `## ${h}\n\n${b}`),
    `> [!TIP]\n> ${tip}`,
    `## Итог\n\nТеперь вы знаете, что такое «${title}», и готовы перейти к практике.`,
  ].join("\n\n");
}

const PHOTOSHOP: LessonSeed[] = [
  {
    title: "Основы Photoshop",
    summary: "Интерфейс, документ, слои и базовые инструменты.",
    minutes: 80,
    lecture: simpleLecture(
      "Основы Photoshop",
      "Photoshop — растровый редактор: изображение состоит из пикселей. Разберёмся, как устроено рабочее пространство и почему всё в Photoshop строится вокруг **слоёв**.",
      [
        ["Рабочее пространство", "- **Панель инструментов** — слева.\n- **Панель параметров** — сверху, меняется для каждого инструмента.\n- **Панели** — справа: Слои, Свойства, Цвет.\n\nСбросить расположение панелей: *Window → Workspace → Reset Essentials*."],
        ["Создание документа", "Для веба используйте **RGB**, разрешение **72 ppi** и размеры в пикселях — например, 1440 × 900 для макета страницы."],
        ["Слои", "Каждый элемент — на своём слое. Слои можно скрывать, переименовывать, группировать (`Ctrl+G`) и менять порядок перетаскиванием."],
      ],
      "Сразу называйте слои осмысленно: «Header / Logo», а не «Layer 37». Через неделю вы скажете себе спасибо.",
    ),
    practice: {
      title: "Первый макет: обложка",
      goal: "Освоить создание документа, работу со слоями и инструментами Move и Type.",
      minutes: 40,
      steps: [
        { title: "Создайте документ", body: "File → New, 1440 × 900 px, RGB, 72 ppi." },
        { title: "Добавьте фон", body: "Залейте фоновый слой цветом или поместите фотографию (File → Place Embedded)." },
        { title: "Добавьте заголовок", body: "Инструментом **Type** (`T`) напишите заголовок, подберите шрифт и размер." },
        { title: "Организуйте слои", body: "Переименуйте все слои и сгруппируйте их по смыслу." },
      ],
      requirements: ["Формат PSD + экспорт в PNG", "Не менее 4 осмысленно названных слоёв", "Минимум одна группа слоёв"],
      criteria: ["Документ корректного размера и цветового режима", "Слои названы и сгруппированы", "Текст читаемый и выровненный"],
    },
    quiz: [
      { type: "SINGLE", text: "Какой цветовой режим используется для веб-макетов?", options: [["RGB", true], ["CMYK", false], ["Grayscale", false], ["Lab", false]], explanation: "Экраны отображают цвет в RGB; CMYK — для печати." },
      { type: "SINGLE", text: "Какой инструмент вызывается клавишей V?", options: [["Перемещение", true], ["Кисть", false], ["Текст", false], ["Лассо", false]] },
      tf("Растровое изображение состоит из пикселей.", true),
      { type: "MULTIPLE", text: "Что можно сделать со слоем?", options: [["Скрыть", true], ["Переименовать", true], ["Сгруппировать", true], ["Превратить в CMYK отдельно от документа", false]] },
    ],
    hotkeys: ["undo", "save", "psMove", "psType", "zoomIn", "zoomOut"],
  },
  {
    title: "Выделение объектов",
    summary: "Marquee, Lasso, Quick Selection и Object Selection.",
    minutes: 80,
    lecture: simpleLecture(
      "Выделение объектов",
      "Выделение — основа почти любой операции в Photoshop: всё, что вы делаете, применяется только к выделенной области.",
      [
        ["Геометрические выделения", "**Marquee** (`M`) — прямоугольник и эллипс. С зажатым `Shift` — квадрат или круг."],
        ["Свободные выделения", "**Lasso** (`L`) — от руки, **Polygonal Lasso** — по прямым отрезкам, **Magnetic Lasso** — прилипает к краям."],
        ["Умные выделения", "**Quick Selection** и **Object Selection** (`W`) сами находят границы объекта. Для сложных краёв дорабатываем в Select and Mask."],
        ["Операции с выделением", "- `Shift` — добавить\n- `Alt` — вычесть\n- `Ctrl+Shift+I` — инвертировать\n- `Ctrl+D` — снять выделение"],
      ],
      "Начинайте с Object Selection — в большинстве случаев он даёт 80% результата за секунду.",
    ),
    practice: {
      title: "Коллаж из трёх объектов",
      goal: "Научиться выбирать подходящий инструмент выделения под форму объекта.",
      minutes: 40,
      steps: [
        { title: "Подберите изображения", body: "Три фото: объект с прямыми краями, круглый объект и объект сложной формы." },
        { title: "Выделите каждый объект", body: "Используйте разные инструменты: Marquee, Lasso и Object Selection." },
        { title: "Перенесите на общий фон", body: "Копируйте выделение на новый слой (`Ctrl+J`) и перетащите в документ коллажа." },
      ],
      requirements: ["PSD с отдельным слоем для каждого объекта", "PNG-превью"],
      criteria: ["Края объектов без явных «ступенек» и остатков фона", "Использованы минимум 3 разных инструмента"],
    },
    quiz: [
      { type: "SINGLE", text: "Как снять выделение?", options: [["Ctrl+D", true], ["Ctrl+Z", false], ["Ctrl+Shift+D", false], ["Esc", false]] },
      { type: "SINGLE", text: "Какая клавиша при выделении вычитает область?", options: [["Alt", true], ["Shift", false], ["Ctrl", false], ["Space", false]] },
      tf("Magnetic Lasso прилипает к контрастным краям объекта.", true),
      { type: "MULTIPLE", text: "Какие инструменты относятся к «умным» выделениям?", options: [["Quick Selection", true], ["Object Selection", true], ["Rectangular Marquee", false], ["Polygonal Lasso", false]] },
    ],
    hotkeys: ["psMarquee", "psLasso", "psQuick", "psDeselect", "psInverse", "psDupLayer"],
  },
  {
    title: "Select and Mask",
    summary: "Точное отделение сложных краёв: волосы, мех, полупрозрачность.",
    minutes: 80,
    lecture: simpleLecture(
      "Select and Mask",
      "Рабочая среда **Select and Mask** нужна, когда обычного выделения недостаточно: волосы, шерсть, листва, полупрозрачная ткань.",
      [
        ["Как открыть", "Select → Select and Mask или `Ctrl+Alt+R`. Также кнопка на панели параметров любого инструмента выделения."],
        ["Режимы просмотра", "**Onion Skin**, **On Black**, **On White** — переключайте, чтобы видеть ошибки на краях."],
        ["Refine Edge Brush", "Проведите кистью по краю волос — Photoshop сам найдёт тонкие пряди."],
        ["Output", "Выводите результат в **Layer Mask** — так исходные пиксели не теряются."],
      ],
      "Включите Decontaminate Colors, чтобы убрать цветную кайму от старого фона на краях.",
    ),
    practice: {
      title: "Портрет на новом фоне",
      goal: "Аккуратно отделить человека с распущенными волосами от фона.",
      minutes: 45,
      steps: [
        { title: "Грубое выделение", body: "Object Selection → клик по человеку." },
        { title: "Уточнение", body: "`Ctrl+Alt+R`, Refine Edge Brush по волосам, режим просмотра On Black." },
        { title: "Вывод в маску", body: "Output To: Layer Mask. Поставьте под слой новый фон." },
      ],
      requirements: ["PSD: исходный слой с маской + новый фон", "PNG-превью"],
      criteria: ["Волосы отделены без «шлема»", "Нет цветной каймы от старого фона", "Используется маска, а не удаление пикселей"],
    },
    quiz: [
      { type: "SINGLE", text: "Сочетание для Select and Mask:", options: [["Ctrl+Alt+R", true], ["Ctrl+Shift+R", false], ["Ctrl+M", false], ["Ctrl+Alt+M", false]] },
      { type: "SINGLE", text: "Какой инструмент лучше всего уточняет волосы?", options: [["Refine Edge Brush", true], ["Eraser", false], ["Brush", false], ["Magic Wand", false]] },
      tf("Вывод в Layer Mask удаляет пиксели исходного слоя.", false, "Маска только скрывает пиксели — их можно вернуть."),
    ],
    hotkeys: ["psSelectMask", "psQuick", "psBrushSmaller", "psBrushBigger"],
  },
  {
    title: "Смарт-фильтры",
    summary: "Недеструктивные фильтры: редактируем, маскируем и комбинируем эффекты без потери качества.",
    minutes: 80,
    lecture: `Обычный фильтр в Photoshop навсегда меняет пиксели слоя. **Смарт-фильтр** применяется к смарт-объекту и остаётся редактируемым: его можно выключить, перенастроить, замаскировать или удалить в любой момент.

> [!NOTE]
> Смарт-фильтр = фильтр, применённый к **смарт-объекту**. Сначала превращаем слой в смарт-объект, потом применяем фильтр.

## Зачем это нужно

- **Недеструктивность** — исходное изображение не меняется.
- **Редактируемость** — двойной клик по фильтру открывает его настройки.
- **Маска фильтра** — эффект можно показать только на части изображения.
- **Режимы наложения** — у каждого фильтра свои Opacity и Blending Mode.

## Как применить смарт-фильтр

1. Выберите слой на панели **Layers**.
2. **Filter → Convert for Smart Filters** (или правый клик → *Convert to Smart Object*).
3. Примените любой фильтр, например **Filter → Blur → Gaussian Blur**.
4. Фильтр появится под слоем в списке **Smart Filters**.

![Структура слоя со смарт-фильтрами](/lectures/smart-filters-layers.svg)

## Маска смарт-фильтра

У списка смарт-фильтров есть общая белая маска. Рисуйте по ней чёрной кистью (\`B\`), чтобы скрыть эффект на участке, белой — чтобы вернуть.

> [!TIP]
> Нажмите \`D\`, чтобы сбросить цвета на чёрный/белый, и \`X\`, чтобы быстро переключаться между ними, пока рисуете по маске.

## Порядок фильтров

Фильтры применяются **снизу вверх**. Перетаскивайте их в списке, чтобы менять порядок — результат может сильно отличаться.

## Параметры наложения

Справа от названия фильтра есть иконка ползунков — **Blending Options**. Здесь можно, например, применить Gaussian Blur в режиме **Overlay** с Opacity 40% — получится эффект мягкого свечения.

> [!WARNING]
> Некоторые фильтры (например, Liquify в старых версиях или Vanishing Point) не работают как смарт-фильтры. Если пункт меню неактивен — проверьте версию Photoshop.

## Типичные сценарии

| Задача | Фильтр |
| --- | --- |
| Размыть фон | Gaussian Blur + маска |
| Мягкое свечение | Gaussian Blur в режиме Overlay |
| Повысить резкость | Smart Sharpen / High Pass |
| Стилизация | Filter Gallery |

## Итог

Смарт-фильтры — стандарт профессиональной работы: вы всегда можете вернуться и изменить решение. В практике соберём постер с несколькими смарт-фильтрами и маской.`,
    practice: {
      title: "Постер с эффектом глубины резкости",
      goal: "Применить несколько смарт-фильтров, настроить их маску и параметры наложения.",
      minutes: 40,
      steps: [
        { title: "Подготовьте слой", body: "Откройте фотографию с выраженным передним планом. Преобразуйте слой: **Filter → Convert for Smart Filters**." },
        { title: "Размойте фон", body: "Примените **Gaussian Blur** 8–15 px. На маске фильтра чёрной кистью скройте размытие на главном объекте." },
        { title: "Добавьте свечение", body: "Дублируйте смарт-объект (`Ctrl+J`), примените Gaussian Blur 20 px и поставьте Blending Options фильтра в режим **Overlay**, Opacity 30–50%." },
        { title: "Повысьте резкость объекта", body: "Примените **Smart Sharpen** и ограничьте его маской только на объекте." },
        { title: "Типографика", body: "Добавьте заголовок постера. Сохраните PSD и экспортируйте PNG." },
      ],
      requirements: ["PSD со смарт-объектами и списком фильтров", "Минимум 3 смарт-фильтра", "Использована маска смарт-фильтра", "PNG-превью 1080 × 1350"],
      criteria: ["Фильтры остаются редактируемыми (не растрированы)", "Маска аккуратная, без резких переходов", "Эффект глубины выглядит естественно", "Аккуратная типографика"],
    },
    quiz: [
      { type: "SINGLE", text: "К какому типу слоя применяется смарт-фильтр?", options: [["Смарт-объект", true], ["Фоновый слой", false], ["Корректирующий слой", false], ["Текстовый слой", false]], explanation: "Смарт-фильтры работают только со смарт-объектами." },
      { type: "SINGLE", text: "В каком порядке применяются смарт-фильтры?", options: [["Снизу вверх", true], ["Сверху вниз", false], ["В алфавитном порядке", false], ["Одновременно", false]] },
      tf("Смарт-фильтр можно отключить, не теряя исходное изображение.", true),
      { type: "MULTIPLE", text: "Что можно настроить у смарт-фильтра?", options: [["Параметры фильтра", true], ["Маску", true], ["Режим наложения", true], ["Разрешение документа", false]] },
      { type: "SINGLE", text: "Чем скрыть эффект на части изображения?", options: [["Чёрной кистью по маске фильтра", true], ["Ластиком по слою", false], ["Белой кистью по маске", false], ["Удалить фильтр", false]] },
    ],
    hotkeys: ["psDupLayer", "psBrush", "psDefaultColors", "psSwapColors", "psFreeT"],
  },
  {
    title: "Маски",
    summary: "Слой-маски, векторные маски и маски корректирующих слоёв.",
    minutes: 80,
    lecture: simpleLecture(
      "Маски",
      "Маска определяет, какая часть слоя видна. **Белое — видно, чёрное — скрыто, серое — полупрозрачно.**",
      [
        ["Слой-маска", "Кнопка *Add layer mask* внизу панели Layers. Рисуйте кистью чёрным и белым."],
        ["Маска из выделения", "Если есть активное выделение, новая маска сразу его повторит."],
        ["Векторная маска", "Создаётся пером — с идеально чёткими краями, масштабируется без потерь."],
        ["Полезные приёмы", "- `Alt` + клик по маске — показать её отдельно\n- `Shift` + клик — временно отключить\n- `Ctrl+I` на маске — инвертировать"],
      ],
      "Используйте мягкую кисть с низкой непрозрачностью (10–20%) для плавных переходов.",
    ),
    practice: {
      title: "Двойная экспозиция",
      goal: "Совместить портрет и пейзаж при помощи слой-масок.",
      minutes: 40,
      steps: [
        { title: "Портрет", body: "Отделите портрет от фона (выделение → маска)." },
        { title: "Пейзаж", body: "Разместите пейзаж над портретом, режим наложения Screen или Lighten." },
        { title: "Маска", body: "Добавьте маску пейзажу и мягкой кистью проявите детали лица." },
      ],
      requirements: ["PSD с масками (без удалённых пикселей)", "PNG-превью"],
      criteria: ["Плавные переходы на маске", "Композиция читается", "Маски, а не ластик"],
    },
    quiz: [
      tf("Чёрный цвет на маске скрывает пиксели слоя.", true),
      { type: "SINGLE", text: "Как инвертировать маску?", options: [["Ctrl+I", true], ["Ctrl+Shift+I", false], ["Ctrl+M", false], ["Ctrl+D", false]] },
      { type: "MULTIPLE", text: "Какие маски бывают в Photoshop?", options: [["Слой-маска", true], ["Векторная маска", true], ["Обтравочная маска", true], ["CMYK-маска", false]] },
    ],
    hotkeys: ["psBrush", "psInvert", "psDefaultColors", "psSwapColors"],
  },
  {
    title: "Clipping Mask",
    summary: "Обтравочные маски: текстура в тексте, фото в фигуре.",
    minutes: 80,
    lecture: simpleLecture(
      "Clipping Mask",
      "Обтравочная маска показывает верхний слой только в пределах непрозрачных пикселей нижнего слоя.",
      [
        ["Как создать", "Поставьте слой над «основой» и нажмите `Ctrl+Alt+G` или `Alt` + клик между слоями."],
        ["Типичные задачи", "- фото внутри текста\n- текстура внутри фигуры\n- корректирующий слой только для одного слоя"],
      ],
      "Корректирующий слой с обтравочной маской влияет только на слой под ним — это главный приём ретуши.",
    ),
    practice: {
      title: "Текст с фото-текстурой",
      goal: "Освоить обтравочные маски на тексте и фигурах.",
      minutes: 40,
      steps: [
        { title: "Текст", body: "Напишите крупное слово жирным шрифтом." },
        { title: "Фото", body: "Поместите фото над текстом и создайте обтравочную маску (`Ctrl+Alt+G`)." },
        { title: "Коррекция", body: "Добавьте корректирующий слой Hue/Saturation также с обтравочной маской." },
      ],
      requirements: ["PSD", "PNG-превью"],
      criteria: ["Текст остаётся редактируемым", "Корректирующий слой влияет только на фото"],
    },
    quiz: [
      { type: "SINGLE", text: "Сочетание для обтравочной маски в Photoshop:", options: [["Ctrl+Alt+G", true], ["Ctrl+G", false], ["Ctrl+7", false], ["Ctrl+Shift+G", false]] },
      tf("Обтравочная маска использует прозрачность нижнего слоя.", true),
    ],
    hotkeys: ["psClip", "psType", "psNewLayer"],
  },
];

const ILLUSTRATOR: LessonSeed[] = [
  {
    title: "Основы Illustrator",
    summary: "Вектор, артборды, фигуры, обводка и заливка.",
    minutes: 80,
    lecture: simpleLecture(
      "Основы Illustrator",
      "Illustrator — **векторный** редактор: объекты описываются математическими кривыми и масштабируются без потери качества.",
      [
        ["Артборды", "Артборд — это «страница». В одном файле их может быть много: например, все иконки набора."],
        ["Fill и Stroke", "У каждого объекта есть заливка и обводка. `X` — переключить активную, `Shift+X` — поменять местами."],
        ["Выделение", "**Selection** (`V`) выделяет объект целиком, **Direct Selection** (`A`) — отдельные точки."],
      ],
      "Включите View → Smart Guides (Ctrl+U) — объекты будут удобно прилипать друг к другу.",
    ),
    practice: {
      title: "Набор из 4 простых иконок",
      goal: "Собрать иконки из базовых фигур.",
      minutes: 40,
      steps: [
        { title: "Артборды", body: "Создайте документ с 4 артбордами 48 × 48 px." },
        { title: "Фигуры", body: "Соберите иконки дом, письмо, лупа, сердце из прямоугольников и эллипсов." },
      ],
      requirements: ["AI-файл", "SVG-экспорт"],
      criteria: ["Единая толщина обводки", "Иконки выровнены по пиксельной сетке"],
    },
    quiz: [
      tf("Векторные объекты теряют качество при масштабировании.", false),
      { type: "SINGLE", text: "Какой инструмент выделяет отдельные опорные точки?", options: [["Direct Selection (A)", true], ["Selection (V)", false], ["Lasso", false], ["Magic Wand", false]] },
      { type: "SINGLE", text: "Что такое артборд?", options: [["Рабочая область-«страница»", true], ["Слой", false], ["Палитра цветов", false], ["Кисть", false]] },
    ],
    hotkeys: ["aiSelect", "aiDirect", "aiRect", "aiEllipse", "aiGroup"],
  },
  {
    title: "Pen Tool",
    summary: "Кривые Безье: опорные точки, направляющие, гладкие и угловые узлы.",
    minutes: 80,
    lecture: simpleLecture(
      "Pen Tool",
      "Перо — главный инструмент векторной графики. Им рисуются кривые Безье.",
      [
        ["Клик и протяжка", "Клик — угловая точка. Клик с протяжкой — гладкая точка с направляющими."],
        ["Правило", "Ставьте точки в местах **экстремумов** кривой — там, где она меняет направление."],
        ["Модификаторы", "- `Alt` — сломать направляющую\n- `Shift` — шаг 45°\n- `Ctrl` — временно Direct Selection"],
      ],
      "Меньше точек — более гладкая кривая. Если точек много — скорее всего, их можно удалить.",
    ),
    practice: {
      title: "Обводка логотипа пером",
      goal: "Отрисовать растровый логотип вектором.",
      minutes: 45,
      steps: [
        { title: "Шаблон", body: "Поместите изображение, сделайте слой шаблоном (Template)." },
        { title: "Обводка", body: "Отрисуйте контуры пером, минимизируя количество точек." },
      ],
      requirements: ["AI-файл", "SVG"],
      criteria: ["Гладкие кривые", "Минимум лишних точек"],
    },
    quiz: [
      { type: "SINGLE", text: "Где ставить опорные точки?", options: [["В экстремумах кривой", true], ["Как можно чаще", false], ["Только в углах", false], ["Случайно", false]] },
      tf("Клик с протяжкой пером создаёт гладкую точку.", true),
    ],
    hotkeys: ["aiPen", "aiAddAnchor", "aiDelAnchor", "aiAnchor", "aiDirect"],
  },
  {
    title: "Контуры",
    summary: "Pathfinder, Shape Builder, соединение и упрощение контуров.",
    minutes: 80,
    lecture: simpleLecture(
      "Контуры",
      "Сложные формы проще собирать из простых, комбинируя контуры.",
      [
        ["Pathfinder", "Unite, Minus Front, Intersect, Exclude — булевы операции над фигурами."],
        ["Shape Builder", "`Shift+M` — объединяйте области протяжкой, вычитайте с `Alt`."],
        ["Join", "`Ctrl+J` соединяет две выделенные конечные точки."],
      ],
      "Shape Builder почти всегда быстрее Pathfinder для сложных форм.",
    ),
    practice: {
      title: "Иконка из примитивов",
      goal: "Собрать сложную иконку булевыми операциями.",
      minutes: 40,
      steps: [{ title: "Сборка", body: "Соберите иконку облака и шестерёнки с помощью Shape Builder." }],
      requirements: ["AI-файл"],
      criteria: ["Итог — единый чистый контур"],
    },
    quiz: [tf("Shape Builder позволяет вычитать области с зажатым Alt.", true), { type: "SINGLE", text: "Соединить две точки:", options: [["Ctrl+J", true], ["Ctrl+G", false], ["Ctrl+7", false], ["Ctrl+E", false]] }],
    hotkeys: ["aiJoin", "aiOutline", "aiUngroup"],
  },
  {
    title: "Brushes",
    summary: "Каллиграфические, художественные, узорчатые кисти и Blob Brush.",
    minutes: 80,
    lecture: simpleLecture(
      "Brushes",
      "Кисти в Illustrator — это способ оформить контур, а не «нарисовать пикселями».",
      [
        ["Типы кистей", "Calligraphic, Scatter, Art, Pattern, Bristle."],
        ["Blob Brush", "`Shift+B` — рисует сразу заливкой, а не обводкой. Удобно для леттеринга."],
      ],
      "Expand Appearance превращает кисть в обычную фигуру перед отправкой в печать.",
    ),
    practice: {
      title: "Леттеринг кистью",
      goal: "Создать надпись Blob Brush и оформить художественной кистью.",
      minutes: 40,
      steps: [{ title: "Надпись", body: "Напишите слово Blob Brush, упростите контур (Object → Path → Simplify)." }],
      requirements: ["AI-файл", "PNG"],
      criteria: ["Ровные плавные линии"],
    },
    quiz: [{ type: "SINGLE", text: "Какая кисть рисует заливкой?", options: [["Blob Brush", true], ["Paintbrush", false], ["Pattern Brush", false], ["Scatter Brush", false]] }],
    hotkeys: ["aiBrush", "aiBlob"],
  },
  {
    title: "Деформация",
    summary: "Envelope Distort, Warp, Free Transform и Puppet Warp.",
    minutes: 80,
    lecture: simpleLecture(
      "Деформация",
      "Деформация позволяет изгибать объекты и текст, не теряя редактируемости.",
      [
        ["Envelope Distort", "Object → Envelope Distort → Make with Warp / Mesh / Top Object."],
        ["Free Transform", "`E` — масштаб, поворот, перспектива и свободное искажение."],
      ],
      "Envelope сохраняет текст редактируемым: двойной клик — и вы внутри.",
    ),
    practice: {
      title: "Эмблема с изогнутым текстом",
      goal: "Использовать Envelope Distort для типографики.",
      minutes: 40,
      steps: [{ title: "Эмблема", body: "Создайте эмблему с текстом, изогнутым через Make with Warp → Arc." }],
      requirements: ["AI-файл"],
      criteria: ["Текст редактируемый", "Аккуратная композиция"],
    },
    quiz: [tf("Envelope Distort сохраняет текст редактируемым.", true)],
    hotkeys: ["aiFreeT", "aiRotate", "aiScale"],
  },
  {
    title: "Векторная пластика",
    summary: "Width Tool, Warp, Twirl — живая форма вектора.",
    minutes: 80,
    lecture: simpleLecture(
      "Векторная пластика",
      "Инструменты пластики делают вектор «живым» — неравномерная толщина линии, органические формы.",
      [
        ["Width Tool", "`Shift+W` — меняет толщину обводки в любой точке."],
        ["Liquify-инструменты", "Warp (`Shift+R`), Twirl, Pucker, Bloat — деформируют контур кистью."],
      ],
      "Width Profile можно сохранить и применять к другим линиям.",
    ),
    practice: {
      title: "Иллюстрация с переменной толщиной линии",
      goal: "Освоить Width Tool.",
      minutes: 40,
      steps: [{ title: "Иллюстрация", body: "Нарисуйте простую иллюстрацию линиями и придайте им пластику Width Tool." }],
      requirements: ["AI-файл", "PNG"],
      criteria: ["Выразительная линия"],
    },
    quiz: [{ type: "SINGLE", text: "Width Tool вызывается:", options: [["Shift+W", true], ["W", false], ["Ctrl+W", false], ["Alt+W", false]] }],
    hotkeys: ["aiWidth", "aiWarp"],
  },
];

export async function createDemoContent(db: PrismaClient, teacherId: string) {
  // Hotkeys
  const hotkeyIds: Record<string, string> = {};
  for (const [key, h] of Object.entries(HOTKEYS)) {
    const created = await db.hotkey.upsert({
      where: { software_keys: { software: h.software, keys: h.keys } },
      create: h,
      update: {},
    });
    hotkeyIds[key] = created.id;
  }

  // Course
  const course = await db.course.create({
    data: {
      title: "Web Design",
      description: "Растровая и векторная графика для веб-дизайнера: Photoshop и Illustrator.",
      published: true,
      teacherId,
    },
  });

  const lessonIds: string[] = [];
  const modules: [string, string, Software, LessonSeed[]][] = [
    ["Photoshop", "Растровая графика, выделение, маски и фильтры.", "PHOTOSHOP", PHOTOSHOP],
    ["Illustrator", "Векторная графика: перо, контуры, кисти, деформация.", "ILLUSTRATOR", ILLUSTRATOR],
  ];

  for (const [mi, [title, description, software, lessons]] of modules.entries()) {
    const mod = await db.module.create({ data: { courseId: course.id, title, description, software, order: mi } });
    for (const [li, l] of lessons.entries()) {
      const lesson = await db.lesson.create({
        data: {
          moduleId: mod.id,
          title: l.title,
          summary: l.summary,
          order: li,
          estimatedMinutes: l.minutes,
          published: true,
          lecture: { create: { body: l.lecture, estimatedMinutes: 15 } },
          practice: {
            create: {
              title: l.practice.title,
              goal: l.practice.goal,
              estimatedMinutes: l.practice.minutes,
              software: [software === "PHOTOSHOP" ? "Adobe Photoshop 2024+" : "Adobe Illustrator 2024+"],
              steps: l.practice.steps,
              requirements: l.practice.requirements,
              criteria: l.practice.criteria,
            },
          },
          quiz: {
            create: {
              title: `Тест: ${l.title}`,
              passingScore: 70,
              questions: {
                create: l.quiz.map((q, qi) => ({
                  type: q.type,
                  text: q.text,
                  explanation: q.explanation ?? "",
                  order: qi,
                  options: { create: q.options.map(([text, isCorrect], oi) => ({ text, isCorrect, order: oi })) },
                })),
              },
            },
          },
          hotkeys: { create: l.hotkeys.map((k, order) => ({ hotkeyId: hotkeyIds[k], order })) },
        },
      });
      lessonIds.push(lesson.id);
    }
  }

  return { courseId: course.id, lessonIds, hotkeyIds };
}
