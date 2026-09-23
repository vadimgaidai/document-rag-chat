import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { ROUTES } from "@/lib/routes"

import type { LucideIcon } from "lucide-react"

interface ILandingCtaCardProps {
  icon: LucideIcon
  title: string
  description: string
  ctaLabel: string
  href: (typeof ROUTES)[keyof typeof ROUTES]
}

export const LandingCtaCard = ({
  icon: Icon,
  title,
  description,
  ctaLabel,
  href,
}: ILandingCtaCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardFooter>
      <Button asChild>
        <Link to={href}>{ctaLabel}</Link>
      </Button>
    </CardFooter>
  </Card>
)
