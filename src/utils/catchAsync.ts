import { Request, Response, NextFunction } from 'express'

export default (requestHandler: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        requestHandler(req, res, next).catch(next)
    }
}