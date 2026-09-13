export default function BrandLogo({ className = "brand-icon", alt = "Smart Attendance Logo", style }) {
  return (
    <div className={className} style={style}>
      <img src="/logo.png" alt={alt} />
    </div>
  );
}
