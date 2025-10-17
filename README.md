🎯 **Etkileşimli Gantt Chart:**
👉 [Projeyi zaman çizelgesiyle görüntüle]( https://kilcimurat.github.io/ganttChart/gantt.html)


gantt
    title Akıllı Fabrika Projesi Zaman Çizelgesi
    dateFormat  YYYY-MM-DD
    axisFormat  %d-%m
    excludes    weekends

    section Planlama
    Gereksinim Analizi          :done,    a1, 2025-09-01, 2025-09-05
    Mimari Tasarım              :active,  a2, 2025-09-06, 2025-09-12

    section Donanım Geliştirme
    RFID Anten Tasarımı         :         a3, 2025-09-13, 2025-09-25
    Sensör Entegrasyonu         :         a4, 2025-09-20, 2025-09-30

    section Yazılım Geliştirme
    Veri Toplama Modülü         :         a5, 2025-10-01, 2025-10-10
    Yapay Zeka Entegrasyonu     :crit,    a6, 2025-10-11, 2025-10-25
    Dashboard Arayüzü           :         a7, 2025-10-15, 2025-10-28

    section Test ve Raporlama
    Sistem Testleri             :         a8, 2025-10-29, 2025-11-02
    Raporlama ve Sunum Hazırlığı:         a9, 2025-11-03, 2025-11-06
