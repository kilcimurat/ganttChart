🎯 **Etkileşimli Gantt Chart:**
👉 [Projeyi zaman çizelgesiyle görüntüle]( https://kilcimurat.github.io/ganttChart/gantt.html)


# 🚀 Project Gantt Chart (Static Preview)

Bu proje zaman çizelgesi, **Frappe Gantt** yapısına dayanarak oluşturulmuş statik bir versiyondur.  
Grafik, `Design`, `Backend`, ve `Frontend` görevlerinin tarih ve ilerleme durumlarını göstermektedir.

---

## 🕒 Project Timeline (Gantt Chart)

Aşağıdaki görsel, proje zaman çizelgesinin statik halidir (SVG veya PNG formatında):

![Project Gantt Chart](https://raw.githubusercontent.com/<USERNAME>/<REPO>/main/docs/gantt_chart.svg)

> 💡 Bu görsel, `frappe-gantt` kütüphanesi kullanılarak oluşturulmuş HTML dosyasının render edilmiş statik çıktısıdır.  
> README içinde HTML veya JavaScript doğrudan çalışmaz, bu yüzden SVG versiyonu gösterilir.

---

## 🧩 Kaynak Kod (HTML Versiyonu)

Aşağıdaki kod, bu görselin üretildiği orijinal HTML yapısını göstermektedir:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Project Gantt Chart</title>
  <script src="https://cdn.jsdelivr.net/npm/frappe-gantt@0.6.1/dist/frappe-gantt.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/frappe-gantt@0.6.1/dist/frappe-gantt.css">
</head>
<body>
  <h2>Project Timeline</h2>
  <svg id="gantt"></svg>
  <script>
    const tasks = [
      { id: 'Design', name: 'Design', start: '2025-10-01', end: '2025-10-05', progress: 100 },
      { id: 'Backend', name: 'Backend Dev', start: '2025-10-06', end: '2025-10-20', progress: 70 },
      { id: 'Frontend', name: 'Frontend Dev', start: '2025-10-10', end: '2025-10-25', progress: 50 },
    ];
    new Gantt("#gantt", tasks);
  </script>
</body>
</html>
