import styles from './Events.module.css'

const events = [
  {
    id: 1,
    title: 'Tech Summit 2025 - Inovação e Futuro',
    date: '15/11/2025',
    location: 'Centro de Convenções, Cidade Tech',
    category: 'Tecnologia',
    rating: 4,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
  },
  {
    id: 2,
    title: 'Festival de Música Eletrônica 2025',
    date: '22/11/2025',
    location: 'Estádio Nacional, Capital Music',
    category: 'Música',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  },
  {
    id: 3,
    title: 'Workshop de Empreendedorismo Digital',
    date: '05/12/2025',
    location: 'Universidade Business, Sala Magna',
    category: 'Negócios',
    rating: 3,
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80',
  },
]

const Stars = ({ rating } : { rating: number }) => (
  <div className={styles.stars}>
    {[1, 2, 3, 4, 5].map((star) => (
      <span key={star} className={star <= rating ? styles.starFilled : styles.starEmpty}>
        ★
      </span>
    ))}
  </div>
)

const Events = () => {
  return (
    <div className={styles.page}>
      <ul className={styles.grid}>
        {events.map((event) => (
          <li key={event.id} className={styles.card}>
            <div className={styles.imageWrapper}>
              <img src={event.image} alt={event.title} className={styles.image} />
            </div>
            <div className={styles.body}>
              <h3 className={styles.title}>{event.title}</h3>
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {event.date}
                </span>
                <span className={styles.metaItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {event.location}
                </span>
              </div>
              <div className={styles.footer}>
                <span className={styles.badge}>{event.category}</span>
                <Stars rating={event.rating} />
              </div>
              <button className={styles.button}>Inscrever-se</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Events