import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AttendancePage } from "./features/attendance/AttendancePage";
import { StudentAttendancePage } from "./features/attendance/StudentAttendancePage";
import { BulkAttendancePage } from "./features/attendance/BulkAttendancePage";
import { MonthlyAttendanceReport } from "./features/attendance/MonthlyAttendanceReport";
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from "./features/auth/AuthPages";
import { AnnouncementsPage, AnnouncementFormPage, NotificationsPage, TemplatesPage } from "./features/communications/CommunicationPages";
import { AnnouncementDetailPage } from "./features/communications/AnnouncementDetailPage";
import { TemplateFormPage } from "./features/communications/TemplateFormPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ForbiddenPage, NotFoundPage } from "./features/errors/ErrorPages";
import { PaymentDetailPage, PaymentFormPage, PaymentsPage, ReceiptDetailPage, ReceiptsPage } from "./features/finance/FinancePages";
import { StudentPaymentsPage } from "./features/finance/StudentPaymentsPage";
import { ReceiptPrintPage } from "./features/finance/ReceiptPrintPage";
import { ReportsPage } from "./features/reports/ReportsPage";
import { MonthlyPaymentsReport } from "./features/reports/MonthlyPaymentsReport";
import { DebtReport } from "./features/reports/DebtReport";
import { OverdueDebtsReport } from "./features/reports/OverdueDebtsReport";
import { AttendanceReport } from "./features/reports/AttendanceReport";
import { ClassOccupancyReport } from "./features/reports/ClassOccupancyReport";
import { BranchPerformanceReport } from "./features/reports/BranchPerformanceReport";
import { DetailPage } from "./features/resources/DetailPage";
import { ResourceFormPage, ResourceListPage } from "./features/resources/ResourcePages";
import { RolesPage } from "./features/roles/RolesPage";
import { RolePermissionsPage } from "./features/roles/RolePermissionsPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { StudentFilesPage } from "./features/students/StudentFilesPage";
import { StudentDetailPage } from "./features/students/StudentDetailPage";
import { StudentParentsPage } from "./features/students/StudentParentsPage";
import { ClassOccupancyPage } from "./features/classes/ClassOccupancyPage";
import { AssignStudentsPage } from "./features/classes/AssignStudentsPage";
import { UserDetailPage } from "./features/users/UserDetailPage";
import { ProtectedRoute } from "./routes/Guards";
import { PermissionRoute } from "./routes/Guards";
import { resources } from "./config/resources";

function ResourceRoutes({ keyName, details = false }: { keyName: string; details?: boolean }) {
  const config = resources[keyName];
  return <>
    <Route element={<PermissionRoute permission={config.permissionRead} />}>
      <Route index element={<ResourceListPage resourceKey={keyName} />} />
      {details && <Route path=":id" element={<DetailPage resourceKey={keyName} />} />}
    </Route>
    <Route element={<PermissionRoute permission={config.permissionWrite} />}>
      <Route path="new" element={<ResourceFormPage resourceKey={keyName} />} />
      <Route path=":id/edit" element={<ResourceFormPage resourceKey={keyName} />} />
    </Route>
  </>;
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route element={<PermissionRoute permission="dashboard.read" />}><Route path="dashboard" element={<DashboardPage />} /></Route>
        <Route path="organizations">{ResourceRoutes({ keyName: "organizations", details: true })}</Route>
        <Route path="branches">{ResourceRoutes({ keyName: "branches", details: true })}</Route>
        <Route path="users">{ResourceRoutes({ keyName: "users" })}<Route element={<PermissionRoute permission="user.read" />}><Route path=":id" element={<UserDetailPage />} /></Route></Route>
        <Route element={<PermissionRoute permission="user.read" />}><Route path="roles" element={<RolesPage />} /></Route>
        <Route element={<PermissionRoute permission="user.write" />}><Route path="roles/:id/permissions" element={<RolePermissionsPage />} /></Route>
        <Route path="students">{ResourceRoutes({ keyName: "students" })}<Route element={<PermissionRoute permission="student.read" />}><Route path=":id" element={<StudentDetailPage />} /><Route path=":id/files" element={<StudentFilesPage />} /><Route path=":id/parents" element={<StudentParentsPage />} /></Route></Route>
        <Route path="parents">{ResourceRoutes({ keyName: "parents" })}</Route>
        <Route path="classes">{ResourceRoutes({ keyName: "classes", details: true })}<Route element={<PermissionRoute permission="class.read" />}><Route path=":id/occupancy" element={<ClassOccupancyPage />} /></Route><Route element={<PermissionRoute permission="class.write" />}><Route path=":id/assign-students" element={<AssignStudentsPage />} /></Route></Route>
        <Route element={<PermissionRoute permission="attendance.read" />}><Route path="attendance" element={<AttendancePage />} /><Route path="attendance/student/:id" element={<StudentAttendancePage />} /><Route path="attendance/reports/monthly" element={<MonthlyAttendanceReport />} /></Route>
        <Route element={<PermissionRoute permission="attendance.write" />}><Route path="attendance/bulk" element={<BulkAttendancePage />} /></Route>
        <Route path="finance/debts">{ResourceRoutes({ keyName: "debts", details: true })}</Route>
        <Route element={<PermissionRoute permission="finance.read" />}><Route path="finance/payments" element={<PaymentsPage />} /><Route path="finance/payments/:id" element={<PaymentDetailPage />} /><Route path="finance/payments/student/:id" element={<StudentPaymentsPage />} /></Route>
        <Route element={<PermissionRoute permission="finance.write" />}><Route path="finance/payments/new" element={<PaymentFormPage />} /></Route>
        <Route element={<PermissionRoute permission="receipt.read" />}><Route path="finance/receipts" element={<ReceiptsPage />} /><Route path="finance/receipts/:id" element={<ReceiptDetailPage />} /><Route path="finance/receipts/:id/print" element={<ReceiptPrintPage />} /></Route>
        <Route element={<PermissionRoute permission="announcement.read" />}><Route path="announcements" element={<AnnouncementsPage />} /><Route path="announcements/:id" element={<AnnouncementDetailPage />} /></Route>
        <Route element={<PermissionRoute permission="announcement.write" />}><Route path="announcements/new" element={<AnnouncementFormPage />} /><Route path="announcements/:id/edit" element={<AnnouncementFormPage />} /></Route>
        <Route element={<PermissionRoute permission="notification.read" />}><Route path="notifications" element={<NotificationsPage />} /><Route path="notifications/templates" element={<TemplatesPage />} /></Route>
        <Route element={<PermissionRoute permission="notification.write" />}><Route path="notifications/templates/new" element={<TemplateFormPage />} /><Route path="notifications/templates/:id/edit" element={<TemplateFormPage />} /></Route>
        <Route element={<PermissionRoute permission="report.read" />}><Route path="reports" element={<ReportsPage />} /><Route path="reports/monthly-payments" element={<MonthlyPaymentsReport />} /><Route path="reports/debts" element={<DebtReport />} /><Route path="reports/overdue-debts" element={<OverdueDebtsReport />} /><Route path="reports/attendance" element={<AttendanceReport />} /><Route path="reports/class-occupancy" element={<ClassOccupancyReport />} /><Route path="reports/branch-performance" element={<BranchPerformanceReport />} /></Route>
        <Route element={<PermissionRoute permission="settings.read" />}><Route path="settings" element={<SettingsPage />} /><Route path="settings/general" element={<SettingsPage initialSection="general" />} /><Route path="settings/integrations" element={<SettingsPage initialSection="integrations" />} /><Route path="settings/uploads" element={<SettingsPage initialSection="uploads" />} /><Route path="settings/notifications" element={<SettingsPage initialSection="notifications" />} /></Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>;
}
