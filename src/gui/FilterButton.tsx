import Icon, { IconType } from './Icon'

import styles from './SearchFiles.module.css'

export function FilterButton({
  icon,
  toggle,
  active,
  tooltip: tooltipTitle,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconType
  toggle: () => any
  active: boolean
  tooltip: string
}) {
  // const { onMouseEnter, onMouseLeave, tooltip } = useTooltip({
  //   position: "below",
  //   tooltip: tooltipTitle,
  // });

  return (
    <>
      <button
        {...props}
        data-active={active}
        // onMouseEnter={onMouseEnter}
        // onMouseLeave={onMouseLeave}
        onClick={() => toggle()}
        className={active ? styles.SelectedSearchFilterButton : styles.SearchFilterButton}
        title={tooltipTitle}
      >
        <Icon className={styles.SearchFilterIcon} type={icon} />
      </button>
      {/* {tooltip} */}
    </>
  )
}
