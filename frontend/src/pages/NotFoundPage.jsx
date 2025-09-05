import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-9xl font-bold text-primary-600">404</h1>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            ไม่พบหน้าที่ต้องการ
          </h2>
          <p className="mt-2 text-gray-600">
            ขอโทษครับ หน้าที่คุณกำลังมองหาไม่มีอยู่ในระบบ
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.history.back()}
            className="btn-outline flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับหน้าก่อนหน้า
          </button>
          <Link
            to="/dashboard"
            className="btn-primary flex items-center justify-center"
          >
            <Home className="w-4 h-4 mr-2" />
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
