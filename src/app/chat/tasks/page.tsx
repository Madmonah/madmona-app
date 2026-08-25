import { redirect } from 'next/navigation'

/* 📋 (٢٥ أغسطس ٢٠٢٦) توحيد مكان المهام.
   محمد: «انا شايف التاسكات متكررة في اكتر من مكان وتاسكات مختلفة
   انا عايز تاسكات تكون في مكان واحد وبتاب التفاصيل».
   التاب ده كان بيعرض نفس مهام get_my_tasks() اللي بتظهر في «شغلي» —
   يعني شاشتين لنفس الداتا. من النهارده «شغلي» هي المكان الوحيد للمهام
   (نفس نمط ريدايركت admin/flow-tasks و admin/listing-drafts). */
export default function ChatTasksRedirect() {
  redirect('/account/work')
}
