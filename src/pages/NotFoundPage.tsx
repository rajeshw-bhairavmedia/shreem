import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center">
      <h1 className="section-heading mb-4">Page Not Found</h1>
      <p className="section-subheading mb-8">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/collections" className="btn-primary">
        Browse Collections
      </Link>
    </div>
  )
}
