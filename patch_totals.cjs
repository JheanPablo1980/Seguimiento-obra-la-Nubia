const fs = require('fs');
let content = fs.readFileSync('src/components/ScheduleProgressModal.tsx', 'utf-8');

// Update totals calculation
const oldTotals = `    const globalPct = totalTarget > 0 ? Math.min(100, (totalExecuted / totalTarget) * 100) : 0;`;
const newTotals = `    let sumPcts = 0;
    let countPcts = 0;
    scheduleItems.forEach(item => {
      if (progressMap[item.id] && progressMap[item.id].completionPercent !== undefined) {
        sumPcts += progressMap[item.id].completionPercent;
        countPcts++;
      }
    });
    const globalPct = countPcts > 0 ? (sumPcts / countPcts) : 0;`;

content = content.replace(oldTotals, newTotals);

fs.writeFileSync('src/components/ScheduleProgressModal.tsx', content);
